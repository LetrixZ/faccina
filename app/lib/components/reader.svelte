<script lang="ts">
	import { run } from 'svelte/legacy';

	import pMap from 'p-map';
	import { toast } from 'svelte-sonner';
	import type { Gallery, Image, ReadState } from '../types';
	import LeftToRight from './touch-layouts/left-to-right.svelte';
	import RightToLeft from './touch-layouts/right-to-left.svelte';
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import { ImageSize, TouchLayout } from '$lib/models';
	import {
		currentArchive,
		nextPage,
		preferencesOpen,
		prefs,
		prevPage,
		readerPage,
	} from '$lib/reader-store';
	import { type ReaderPreferences } from '$lib/utils';

	interface Props {
		gallery: Gallery;
	}

	let { gallery }: Props = $props();

	type ImageState = 'idle' | 'preloading' | 'preloaded';

	let imageEl: HTMLImageElement = $state();
	let container: HTMLDivElement = $state();

	let imageStyle = $state('');
	let containerStyle = $state('');

	let pageState: (Image & { state: ImageState })[] = gallery.images.map((image) => ({
		...image,
		state: 'idle',
	}));

	let currentPage = $derived($page.state.page ?? parseInt($page.params.page));
	let image = $derived(gallery.images.find((image) => image?.pageNumber === currentPage));

	run(() => {
		$prevPage = currentPage > 1 ? currentPage - 1 : undefined;
		$nextPage = gallery.pages && currentPage < gallery.pages ? currentPage + 1 : undefined;
	});

	run(() => {
		$currentArchive = gallery;
	});

	const readStat = (page: number) => {
		fetch('/stats/read-page', {
			method: 'POST',
			body: JSON.stringify({
				pageNumber: page,
				isLastPage: gallery.images.length === page,
				archiveId: gallery.id,
			} satisfies ReadState),
			headers: {
				'Content-Type': 'application/json',
			},
		});
	};

	const changePage = (page?: number) => {
		if (!page || !container) {
			return;
		}

		const imageInfo = gallery.images.find((image) => image.pageNumber === page);

		if (!imageInfo) {
			return;
		}

		const newImage = new Image(imageInfo.width ?? undefined, imageInfo.height ?? undefined);
		newImage.src = `/image/${gallery.hash}/${imageInfo.pageNumber}`;
		newImage.alt = `Page ${currentPage}`;
		newImage.onerror = () => toast.error('Failed to load the page');

		imageEl?.classList.forEach((className) => newImage.classList.add(className));
		imageEl?.replaceWith(newImage);
		imageEl = newImage;

		replaceState(page.toString(), { page });
		container.scrollTo({ top: 0 });
	};

	const changePageState = (page: number, newState: ImageState) => {
		pageState = pageState.map((state) => {
			if (state.pageNumber === page) {
				state.state = newState;
			}

			return state;
		});
	};

	const preloadImages = async (currentPage: number) => {
		await pMap(
			[currentPage + 1, currentPage + 2, currentPage - 1, currentPage + 3, currentPage - 2]
				.filter((page) => gallery.images.some(({ pageNumber }) => pageNumber === page))
				.filter((page) => pageState.find((state) => state.pageNumber === page)!.state === 'idle')
				.map((page) => gallery.images.find(({ pageNumber }) => pageNumber === page)!),
			async (imageInfo) => {
				const { filename, pageNumber } = imageInfo;

				if (pageState.find((state) => state.pageNumber === pageNumber)!.state !== 'idle') {
					return;
				}

				changePageState(pageNumber, 'preloading');

				const newImage = new Image(imageInfo.width ?? undefined, imageInfo.height ?? undefined);
				newImage.src = `/image/${gallery.hash}/${filename}`;

				if (newImage.complete) {
					newImage.addEventListener('error', () => changePageState(pageNumber, 'preloaded'));
				} else {
					newImage.addEventListener('load', () => changePageState(pageNumber, 'preloaded'));
					newImage.addEventListener('error', () => changePageState(pageNumber, 'idle'));
				}
			},
			{ concurrency: 2 }
		);
	};

	const getImageStyle = (
		{ imageSize: fitMode, minWidth, maxWidth }: ReaderPreferences,
		image: Image
	) => {
		switch (fitMode) {
			case ImageSize.FillWidth:
				if (image.width) {
					if (maxWidth) {
						return `width: clamp(${Math.min(maxWidth, Math.max(image.width, minWidth ?? 1))}px, 100%, ${maxWidth}px); height: auto;`;
					} else if (minWidth) {
						return `width: max(${Math.max(image.width, minWidth)}px, 100%); height: auto;`;
					}
				}

				return `width: 100%; height: auto;`;
			case ImageSize.FillHeight:
				return `height: 100%; width: auto; object-fit: contain;`;
			case ImageSize.Original:
			default:
				if (image.width) {
					if (maxWidth) {
						return `width: min(${Math.max(image.width, minWidth ?? 1)}px, min(${maxWidth}px, 100%));`;
					} else if (minWidth) {
						return `width: min(${Math.max(image.width, minWidth)}px, 100%);`;
					}
				}

				return ``;
		}
	};

	const updateStyles = (prefs: ReaderPreferences, image?: Image) => {
		if (!image) {
			return;
		}

		imageStyle = getImageStyle(prefs, image);
		setTimeout(() => (containerStyle = `min-height: ${imageEl?.scrollHeight}px`));

		if (imageEl) {
			imageEl.style.cssText = imageStyle;
		}
	};

	run(() => {
		updateStyles($prefs, image);
	});
	run(() => {
		preloadImages(currentPage);
	});
	run(() => {
		changePage($readerPage);
	});
	run(() => {
		readStat(currentPage);
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if ($preferencesOpen) {
			return;
		}

		switch (event.code) {
			case 'ArrowLeft':
			case 'KeyA':
				if (prevPage) {
					changePage($prevPage);
				}
				break;
			case 'ArrowRight':
			case 'KeyD':
				if (nextPage) {
					changePage($nextPage);
				}
				break;
			case 'Backspace':
				goto(`/g/${gallery.id}${$page.url.search}`);
		}
	}}
	onresize={() => updateStyles($prefs, image)}
/>

<div class="flex h-dvh w-full flex-col overflow-clip">
	<div bind:this={container} class="relative my-auto flex h-full overflow-auto">
		<div class="absolute inset-0 flex min-h-full min-w-full max-w-full" style={containerStyle}>
			{#if $prefs.touchLayout === TouchLayout.LeftToRight}
				<LeftToRight {changePage} />
			{:else if $prefs.touchLayout === TouchLayout.RightToLeft}
				<RightToLeft {changePage} />
			{/if}
		</div>

		{#if image}
			<img
				alt={`Page ${currentPage}`}
				bind:this={imageEl}
				class="m-auto"
				height={image.height}
				loading="eager"
				onerror={() => toast.error('Failed to load the page')}
				src={`/image/${gallery.hash}/${image?.pageNumber}`}
				style={imageStyle}
				width={image.width}
			/>
		{/if}
	</div>
</div>
