<script lang="ts">
	import type { ArchiveDetail } from '$lib/models';

	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import { type Image, ImageSize, TouchLayout } from '$lib/models';
	import {
		currentArchive,
		nextPage,
		preferencesOpen,
		prefs,
		prevPage,
		readerPage,
	} from '$lib/reader-store';
	import { type ReaderPreferences } from '$lib/utils';
	import pMap from 'p-map';
	import { toast } from 'svelte-sonner';

	import LeftToRight from './touch-layouts/left-to-right.svelte';
	import RightToLeft from './touch-layouts/right-to-left.svelte';

	export let archive: ArchiveDetail;

	type ImageState = 'idle' | 'preloading' | 'preloaded';

	let imageEl: HTMLImageElement;
	let container: HTMLDivElement;

	let imageStyle = '';
	let containerStyle = '';

	let pageState: (Image & { state: ImageState })[] = archive.images.map((image) => ({
		...image,
		state: 'idle',
	}));

	$: currentPage = $page.state.page || parseInt($page.params.page!);
	$: image = archive.images.find((image) => image?.page_number === currentPage)!;

	$: {
		$prevPage = currentPage > 1 ? currentPage - 1 : undefined;
		$nextPage = archive.pages && currentPage < archive.pages ? currentPage + 1 : undefined;
	}

	$: $currentArchive = archive;

	const changePage = (page?: number) => {
		if (!page || !container) {
			return;
		}

		const imageInfo = archive.images.find((image) => image.page_number === page);

		if (!imageInfo) {
			return;
		}

		const newImage = new Image(imageInfo.width ?? undefined, imageInfo.height ?? undefined);
		newImage.src = `/image/${archive.hash}/${imageInfo.page_number}`;
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
			if (state.page_number === page) {
				state.state = newState;
			}

			return state;
		});
	};

	const preloadImages = async (currentPage: number) => {
		await pMap(
			[currentPage + 1, currentPage + 2, currentPage - 1, currentPage + 3, currentPage - 2]
				.filter((page) => archive.images.some(({ page_number }) => page_number === page))
				.filter((page) => pageState.find((state) => state.page_number === page)!.state === 'idle')
				.map((page) => archive.images.find(({ page_number }) => page_number === page)!),
			async (imageInfo) => {
				const { filename, page_number } = imageInfo;

				if (pageState.find((state) => state.page_number === page_number)!.state !== 'idle') {
					return;
				}

				changePageState(page_number, 'preloading');

				const newImage = new Image(imageInfo.width ?? undefined, imageInfo.height ?? undefined);
				newImage.src = `/image/${archive.hash}/${filename}`;

				if (newImage.complete) {
					newImage.addEventListener('error', () => changePageState(page_number, 'preloaded'));
				} else {
					newImage.addEventListener('load', () => changePageState(page_number, 'preloaded'));
					newImage.addEventListener('error', () => changePageState(page_number, 'idle'));
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
					if (maxWidth && minWidth) {
						return `width: clamp(${Math.min(maxWidth, Math.max(image.width, minWidth))}px, 100%, ${maxWidth}px); height: auto;`;
					} else if (minWidth) {
						return `width: max(${Math.max(image.width, minWidth)}px, 100%); height: auto;`;
					} else if (maxWidth) {
						return `width: min(${Math.max(image.width, maxWidth)}px, 100%); height: auto;`;
					}
				}

				return `width: 100%; height: auto;`;
			case ImageSize.FillHeight:
				return `height: 100%; width: auto; object-fit: contain;`;
			case ImageSize.Original:
			default:
				if (image.width) {
					if (maxWidth && minWidth) {
						return `width: min(${Math.max(image.width, minWidth)}px, min(${maxWidth}px, 100%));`;
					} else if (minWidth) {
						return `width: min(${Math.max(image.width, minWidth)}px, 100%);`;
					}
				}

				return ``;
		}
	};

	const updateStyles = (prefs: ReaderPreferences, image: Image) => {
		imageStyle = getImageStyle(prefs, image);
		setTimeout(() => (containerStyle = `min-height: ${imageEl?.scrollHeight}px`));

		if (imageEl) {
			imageEl.style.cssText = imageStyle;
		}
	};

	$: updateStyles($prefs, image);
	$: preloadImages(currentPage);
	$: changePage($readerPage);
</script>

<svelte:window
	on:keydown={(event) => {
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
				goto(`/g/${archive.id}${$page.url.search}`);
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

		<img
			alt={`Page ${currentPage}`}
			bind:this={imageEl}
			class="m-auto"
			height={image?.height}
			loading="eager"
			on:error={() => toast.error('Failed to load the page')}
			src={`/image/${archive.hash}/${image?.page_number}`}
			style={imageStyle}
			width={image?.width}
		/>
	</div>
</div>
