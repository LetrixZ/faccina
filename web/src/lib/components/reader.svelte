<script lang="ts">
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import type { Archive } from '$lib/models';
	import { ImageSize, type Image } from '$lib/models';
	import {
		currentArchive,
		nextPage,
		preferencesOpen,
		prefs,
		previewLayout,
		prevPage,
		readerPage,
		showBar,
	} from '$lib/reader-store';
	import { cn, type ReaderPreferences } from '$lib/utils';
	import pMap from 'p-map';
	import { toast } from 'svelte-sonner';

	export let archive: Archive;

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
		$nextPage = currentPage < archive.pages ? currentPage + 1 : undefined;
	}

	$: prevPageUrl = $prevPage ? `${$prevPage}${$page.url.search}` : undefined;
	$: nextPageUrl = $nextPage ? `${$nextPage}${$page.url.search}` : undefined;

	$: $currentArchive = archive;

	const changePage = (page?: number) => {
		if (!page || !container) {
			return;
		}

		const imageInfo = archive.images.find((image) => image.page_number === page);

		if (!imageInfo) {
			return;
		}

		const newImage = new Image(imageInfo.width, imageInfo.height);
		newImage.src = `${env.PUBLIC_CDN_URL}/image/${archive.hash}/${imageInfo.filename}`;
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

				const newImage = new Image(imageInfo.width, imageInfo.height);
				newImage.src = `${env.PUBLIC_CDN_URL}/image/${archive.hash}/${filename}`;

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
				if (maxWidth && minWidth) {
					return `width: clamp(${Math.min(maxWidth, Math.max(image.width, minWidth))}px, 100%, ${maxWidth}px); height: auto;`;
				} else if (minWidth) {
					return `width: max(${Math.max(image.width, minWidth)}px, 100%); height: auto;`;
				} else if (maxWidth) {
					return `width: min(${Math.max(image.width, maxWidth)}px, 100%); height: auto;`;
				} else {
					return `width: 100%; height: auto;`;
				}
			case ImageSize.FillHeight:
				return `height: 100%; width: auto; object-fit: contain;`;
			case ImageSize.Original:
			default:
				if (maxWidth && minWidth) {
					return `width: min(${Math.max(image.width, minWidth)}px, min(${maxWidth}px, 100%));`;
				} else if (minWidth) {
					return `width: min(${Math.max(image.width, minWidth)}px, 100%);`;
				} else {
					return ``;
				}
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
	on:resize={() => updateStyles($prefs, image)}
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
/>

<div class="flex h-dvh w-full flex-col overflow-clip">
	<div bind:this={container} class="relative my-auto flex h-full overflow-auto">
		<div class="absolute inset-0 flex min-h-full min-w-full max-w-full" style={containerStyle}>
			<a
				class={cn('relative h-full flex-grow outline-none', $previewLayout && 'bg-blue-500/50 ')}
				href={prevPageUrl}
				draggable="false"
				on:click|preventDefault={() => changePage($prevPage)}
			>
				<span class="sr-only"> Previous page </span>
			</a>
			<button
				class="h-full min-w-28 max-w-56 basis-[20%] outline-none"
				on:click={() => ($showBar = !$showBar)}
			/>
			<a
				class={cn('relative h-full flex-grow outline-none', $previewLayout && 'bg-red-500/50')}
				href={nextPageUrl}
				draggable="false"
				on:click|preventDefault={() => changePage($nextPage)}
			>
				<span class="sr-only"> Next page </span>
			</a>
		</div>

		{#if $previewLayout}
			<div class="pointer-events-none fixed inset-0 flex h-full min-w-full max-w-full opacity-100">
				<div class="relative flex h-full flex-grow items-center justify-center">
					<span class="stroke rounded-md text-2xl font-semibold uppercase tracking-wider">
						Prev
					</span>
				</div>
				<div class="h-full min-w-28 max-w-56 basis-[20%]"></div>
				<div class="relative flex h-full flex-grow items-center justify-center">
					<span class="stroke rounded-md text-2xl font-semibold uppercase tracking-wider">
						Next
					</span>
				</div>
			</div>
		{/if}

		<img
			bind:this={imageEl}
			height={image?.height}
			width={image?.width}
			alt={`Page ${currentPage}`}
			src={`${env.PUBLIC_CDN_URL}/image/${archive.hash}/${image?.filename}`}
			loading="eager"
			style={imageStyle}
			class="m-auto"
			on:error={() => toast.error('Failed to load the page')}
		/>
	</div>
</div>
