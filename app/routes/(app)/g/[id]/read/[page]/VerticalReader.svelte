<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import { siteConfig } from '$lib/stores';
	import { cn, getImageDimensions, getImageUrl } from '$lib/utils';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Scaling, TouchLayoutOption } from './reader';
	import TouchNavigation from './TouchNavigation.svelte';
	import type { Gallery, Image } from '$lib/types';
	import type { ReaderPreset } from '~shared/config/image.schema';

	export let gallery: Gallery;
	export let currentPage: number;

	export let verticalGap: number;
	export let minWidth: number;
	export let maxWidth: number;

	export let selectedScaling: Scaling;
	export let selectedPreset: ReaderPreset | undefined;
	export let selectedTouchLayoutOption: TouchLayoutOption;

	export let previewLayout: boolean;

	export let hasPrevious: boolean;
	export let hasNext: boolean;

	export let gotoPage: (page: number) => void;
	export let onPrevious: () => void;
	export let onNext: () => void;
	export let onMenu: (value?: boolean) => void;

	let visiblePage = 1;

	let blockScrollingNavigation = false;

	let scrollContainer: HTMLDivElement;
	let navContainer: HTMLDivElement;
	let endContainer: HTMLDivElement;

	let containers: HTMLDivElement[] = [];

	let clientWidth: number;
	let clientHeight = 0;

	let hasWidth = false;

	export function scrollTo(page: number, skipNavigation: boolean = false) {
		blockScrollingNavigation = true;
		containers[page - 1]?.scrollIntoView({ behavior: 'instant' });

		if (!skipNavigation) {
			gotoPage(page);
		}

		setTimeout(() => (blockScrollingNavigation = false));
	}

	function getStyle(
		image: Image,
		preset: ReaderPreset | undefined,
		scaling: Scaling,
		clientWidth: number,
		clientHeight: number,
		minWidth: number,
		maxWidth: number
	) {
		const { width, height } = getImageDimensions(image, preset);
		const imageRatio = width / height;

		const screenRatio = clientWidth / clientHeight;

		switch (scaling) {
			case 'original':
				return `${minWidth ? `width: max(${minWidth}px, ${width}px)` : `width: ${width}px;`}; max-width: ${maxWidth ? `min(${maxWidth}px, 100%)` : '100%'}; aspect-ratio: ${imageRatio};`;
			case 'fill-width':
				return `width: 100%; aspect-ratio: ${imageRatio}`;
			case 'fill-height':
				if (screenRatio < imageRatio) {
					return `aspect-ratio: ${imageRatio}; height: ${(height * clientWidth) / width}px`;
				} else {
					return `max-width: 100%; aspect-ratio: ${imageRatio}; height: ${height}px;`;
				}
		}
	}

	function getImageStyle(
		image: Image,
		preset: ReaderPreset | undefined,
		scaling: Scaling,
		minWidth: number
	) {
		const { width } = getImageDimensions(image, preset);

		if (scaling === 'original') {
			if (minWidth) {
				return `${minWidth ? `width: max(${minWidth}px, ${width}px)` : `width: ${width}px;`};`;
			}
		}

		return '';
	}

	function shouldRender(index: number, visiblePage: number) {
		const page = index + 1;

		if (visiblePage - 2 <= page && visiblePage + 2 >= page) {
			return true;
		}
	}

	function setPosition() {
		if (!navContainer || !scrollContainer) {
			return;
		}

		navContainer.style.top = `${scrollContainer.scrollTop}px`;
	}

	function onScroll() {
		setPosition();
		getCurrentContainer(clientHeight);
	}

	function getCurrentContainer(scrollHeight: number) {
		let page = 1;

		for (const [index, container] of containers.entries()) {
			const rect = container.getBoundingClientRect();

			if (rect.top < scrollHeight / 2) {
				page = index + 1;
			}
		}

		if (!blockScrollingNavigation && visiblePage !== page) {
			try {
				gotoPage(page);
			} catch {
				/* empty */
			}
		}

		visiblePage = page;

		if (endContainer) {
			const rect = endContainer.getBoundingClientRect();

			if (rect.top < scrollHeight / 1.5) {
				onMenu(true);
			} else {
				onMenu(false);
			}
		}
	}

	beforeNavigate((navigation) => {
		if (navigation.type === 'popstate' && navigation.to?.route.id === '/(app)/g/[id]/read/[page]') {
			const page = parseInt(navigation.to.params!.page!);
			scrollTo(page, true);
		}
	});

	onMount(() => {
		setPosition();
		setTimeout(() => {
			scrollTo(currentPage, true);
		});
	});

	$: {
		getCurrentContainer(clientHeight);
	}

	$: {
		if (clientWidth !== undefined) {
			hasWidth = true;
		}
	}
</script>

<div
	bind:this={scrollContainer}
	class="relative h-full w-full overflow-y-auto"
	bind:clientHeight
	bind:clientWidth
	on:scroll={onScroll}
>
	<div class="relative h-80 w-full">
		<div
			class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 text-neutral-200"
		>
			<p class="text-2xl font-medium">Start of chapter</p>
		</div>
	</div>

	{#each gallery.images as image, index (image.pageNumber)}
		<div
			bind:this={containers[index]}
			style="margin-bottom: {index !== gallery.pages - 1 ? verticalGap : 0}px; {getStyle(
				image,
				selectedPreset,
				selectedScaling,
				clientWidth,
				clientHeight,
				minWidth,
				maxWidth
			)}"
			class={cn(
				'relative mx-auto',
				(selectedScaling === 'original' || selectedScaling === 'fill-height') && 'w-fit',
				selectedScaling === 'fill-width' && 'w-full',
				selectedScaling === 'fill-height' && 'max-h-full'
			)}
		>
			{#if hasWidth && shouldRender(index, visiblePage)}
				<img
					style={getImageStyle(image, selectedPreset, selectedScaling, minWidth)}
					class={cn(
						(selectedScaling === 'original' || selectedScaling === 'fill-height') && 'w-fit',
						selectedScaling === 'fill-width' && 'w-full',
						selectedScaling === 'fill-height' && 'h-full max-h-dvh'
					)}
					alt="{gallery.title} page {image.pageNumber}"
					src={getImageUrl(image.pageNumber, gallery, selectedPreset, $siteConfig.imageServer)}
					in:fade={{ duration: 100 }}
				/>
			{/if}
		</div>
	{/each}

	<div bind:this={endContainer} class="relative h-[40dvh] w-full">
		<div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-neutral-200">
			<p class="text-2xl font-medium">End of chapter</p>
			<Button class="z-50" href="/g/{gallery.id}{$page.url.search}" variant="outline">
				Go back
			</Button>
		</div>
	</div>

	<TouchNavigation
		{hasNext}
		{hasPrevious}
		{onMenu}
		{onNext}
		{onPrevious}
		{previewLayout}
		{selectedTouchLayoutOption}
		bind:navContainer
	/>
</div>
