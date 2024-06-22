<script lang="ts">
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import type { Archive } from '$lib/models';
	import { ImageFitMode, type Image } from '$lib/models';
	import {
		currentArchive,
		nextPage,
		preferencesOpen,
		prefs,
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

	let previewLayout = false;

	let pageState: (Image & { state: ImageState })[] = archive.images.map((image) => ({
		...image,
		state: 'idle',
	}));

	$: currentPage = $page.state.page || parseInt($page.params.page!);
	$: image = archive.images.find((image) => image?.page_number === currentPage);

	$: {
		$prevPage = currentPage > 1 ? currentPage - 1 : undefined;
		$nextPage = currentPage < archive.pages ? currentPage + 1 : undefined;
	}

	$: prevPageUrl = $prevPage ? `${$prevPage}${$page.url.search}` : undefined;
	$: nextPageUrl = $nextPage ? `${$nextPage}${$page.url.search}` : undefined;

	const changePage = (page?: number) => {
		if (!page) {
			return;
		}

		const imageInfo = archive.images.find((image) => image.page_number === page);

		if (!imageInfo) {
			return;
		}

		const newImage = new Image(imageInfo.width, imageInfo.height);
		newImage.src = `${env.PUBLIC_CDN_URL}/image/${archive.hash}/${page}`;
		newImage.alt = `Page ${currentPage}`;
		newImage.onerror = () => toast.error('Failed to load the page');

		imageEl.classList.forEach((className) => newImage.classList.add(className));
		imageEl.replaceWith(newImage);
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

	const preloadImages = async () => {
		await pMap(
			[currentPage + 1, currentPage + 2, currentPage - 1, currentPage + 3, currentPage - 2]
				.filter((page) => archive.images.some(({ page_number }) => page_number === page))
				.filter((page) => pageState.find((state) => state.page_number === page)!.state === 'idle')
				.map((page) => archive.images.find(({ page_number }) => page_number === page)!),
			async (imageInfo) => {
				const { page_number } = imageInfo;

				changePageState(page_number, 'preloading');

				const newImage = new Image(imageInfo.width, imageInfo.height);
				newImage.src = `${env.PUBLIC_CDN_URL}/image/${archive.hash}/${page_number}`;

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

	const getContainerStyle = ($prefs: ReaderPreferences, image: Image | undefined) => {
		if (!image) {
			return;
		}

		const base = `aspect-ratio: ${image.width / image.height};`;

		switch ($prefs.fitMode) {
			case ImageFitMode.MaxWidth:
				if ($prefs.maxWidth) {
					return base + `max-height: ${($prefs.maxWidth * image.height) / image.width}px;`;
				}
			case ImageFitMode.ImageWidth:
				return base + `max-height: ${image.height}px;`;
			case ImageFitMode.FitHeight:
				return base + 'max-height: 100%';
			default:
				return base;
		}
	};

	const getImageStyle = ($prefs: ReaderPreferences) => {
		switch ($prefs.fitMode) {
			case ImageFitMode.ImageWidth:
				return ``;
			case ImageFitMode.MaxWidth:
				if ($prefs.maxWidth) {
					return `max-width: clamp(0px, ${$prefs.maxWidth}px, 100%);`;
				} else {
					return `max-width: '100%';`;
				}
			case ImageFitMode.FitHeight:
				return `width: auto; max-height: 100%;`;
		}
	};

	$: {
		if (imageEl && currentPage) {
			preloadImages();
		}
	}

	$: {
		if (imageEl && $prefs) {
			imageEl.style.cssText = getImageStyle($prefs);
		}
	}

	$: {
		changePage($readerPage);
	}

	$: {
		$currentArchive = archive;
	}
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
			case 'ArrowUp':
			case 'KeyW':
				goto(`/g/${archive.id}${$page.url.search}`);
		}
	}}
/>

<div class="flex h-dvh w-full flex-col overflow-clip">
	<div bind:this={container} class="relative my-auto flex h-full overflow-auto">
		<div
			class="absolute inset-0 flex min-h-full min-w-full max-w-full"
			style={getContainerStyle($prefs, image)}
		>
			<a
				class={cn('relative h-full flex-grow outline-none', previewLayout && 'bg-blue-500/50 ')}
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
				class={cn('relative h-full flex-grow outline-none', previewLayout && 'bg-red-500/50')}
				href={nextPageUrl}
				draggable="false"
				on:click|preventDefault={() => changePage($nextPage)}
			>
				<span class="sr-only"> Next page </span>
			</a>
		</div>

		{#if previewLayout}
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
			src={`${env.PUBLIC_CDN_URL}/image/${archive.hash}/${currentPage}`}
			loading="eager"
			style={getImageStyle($prefs)}
			class="m-auto bg-neutral-500"
			on:error={() => toast.error('Failed to load the page')}
		/>
	</div>
</div>
