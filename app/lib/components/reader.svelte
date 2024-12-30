<script lang="ts">
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
		prefs,
		presets,
		prevPage,
		readerPage,
	} from '$lib/reader-store';
	import { type ReaderPreferences } from '$lib/utils';
	import { siteConfig, user } from '$lib/stores';

	export let gallery: Gallery;

	type ImageState = 'idle' | 'preloading' | 'preloaded';

	let imageEl: HTMLImageElement;
	let container: HTMLDivElement;

	let imageStyle = '';
	let containerStyle = '';

	let pageState: (Image & { state: ImageState })[] = gallery.images.map((image) => ({
		...image,
		state: 'idle',
	}));

	$: currentPage = $page.state.page ?? parseInt($page.params.page ?? '1');
	$: image = gallery.images.find((image) => image?.pageNumber === currentPage);

	$: {
		$prevPage = currentPage > 1 ? currentPage - 1 : undefined;
		$nextPage = gallery.pages && currentPage < gallery.pages ? currentPage + 1 : undefined;
	}

	$: $currentArchive = gallery;

	const getImageUrl = (image: Image | undefined, preset: string | undefined) => {
		if (!image) {
			return '';
		}

		if (preset && preset !== '[original]') {
			return `/image/${gallery.hash}/${image.pageNumber}?type=${preset}`;
		} else {
			return `/image/${gallery.hash}/${image.pageNumber}`;
		}
	};

	const getImageDimensions = (image: Image | undefined, preset: string | undefined) => {
		if (!image) {
			return;
		}

		if (!image.height || !image.width) {
			return;
		}

		if (preset) {
			const presetItem = $presets.find((p) => p.hash === preset);

			if (presetItem) {
				const width = presetItem.width;

				return {
					width: Math.round(width),
					height: Math.round((width * image.height) / image.width),
				};
			}
		}

		return {
			width: image.width,
			height: image.height,
		};
	};

	const readStat = (page: number) => {
		if ($siteConfig.enableReadHistory && $user) {
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
		}
	};

	const changePage = (page?: number) => {
		if (!page || !container) {
			return;
		}

		const imageInfo = gallery.images.find((image) => image.pageNumber === page);

		if (!imageInfo) {
			return;
		}

		const dimensions = getImageDimensions(imageInfo, $prefs.preset);

		const newImage = new Image(dimensions?.width, dimensions?.height);
		newImage.src = getImageUrl(imageInfo, $prefs.preset);
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
				const { pageNumber } = imageInfo;

				if (pageState.find((state) => state.pageNumber === pageNumber)!.state !== 'idle') {
					return;
				}

				changePageState(pageNumber, 'preloading');

				const dimensions = getImageDimensions(imageInfo, $prefs.preset);

				const newImage = new Image(dimensions?.width, dimensions?.height);
				newImage.src = getImageUrl(imageInfo, $prefs.preset);

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
		const dimensions = getImageDimensions(image, $prefs.preset);
		const width = dimensions?.width;

		switch (fitMode) {
			case ImageSize.FillWidth:
				if (width !== undefined) {
					if (maxWidth) {
						return `width: clamp(${Math.min(maxWidth, Math.max(width, minWidth ?? 1))}px, 100%, ${maxWidth}px); height: auto;`;
					} else if (minWidth) {
						return `width: max(${Math.max(width, minWidth)}px, 100%); height: auto;`;
					}
				}

				return `width: 100%; height: auto;`;
			case ImageSize.FillHeight:
				return `height: 100%; width: auto; object-fit: contain;`;
			case ImageSize.Original:
			default:
				if (width !== undefined) {
					if (maxWidth) {
						return `width: min(${Math.max(width, minWidth ?? 1)}px, min(${maxWidth}px, 100%));`;
					} else if (minWidth) {
						return `width: min(${Math.max(width, minWidth)}px, 100%);`;
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

	$: updateStyles($prefs, image);
	$: preloadImages(currentPage);
	$: changePage($readerPage);
	$: readStat(currentPage);

	$: imgSrc = getImageUrl(image, $prefs.preset);
</script>

<svelte:window
	on:keydown={(event) => {
		if ($page.state.readerPreferencesOpen === true) {
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
	on:resize={() => updateStyles($prefs, image)}
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
				height={getImageDimensions(image, $prefs.preset)?.height}
				loading="eager"
				on:error={() => toast.error('Failed to load the page')}
				src={imgSrc}
				style={imageStyle}
				width={getImageDimensions(image, $prefs.preset)?.width}
			/>
		{/if}
	</div>
</div>
