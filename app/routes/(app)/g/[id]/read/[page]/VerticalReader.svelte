<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import { cn, getImageDimensions, getImageUrl } from '$lib/utils';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Scaling, TouchLayoutOption } from './reader.svelte';
	import TouchNavigation from './TouchNavigation.svelte';
	import type { Gallery, Image, SiteConfig } from '$lib/types';
	import type { ReaderPreset } from '~shared/config/image.schema';

	type Props = {
		gallery: Gallery;
		currentPage: number;
		verticalGap: number;
		minWidth: number;
		maxWidth: number;
		selectedPreset?: ReaderPreset;
		selectedScaling: Scaling;
		selectedTouchLayoutOption: TouchLayoutOption;
		previewLayout: boolean;
		hasPrevious: boolean;
		hasNext: boolean;
		gotoPage: (page: number) => void;
		onPrevious: () => void;
		onNext: () => void;
		onMenu: (value?: boolean) => void;
		scrollTo?: (page: number) => void;
		siteConfig: SiteConfig;
	};

	let {
		gallery,
		currentPage,
		verticalGap,
		minWidth,
		maxWidth,
		selectedPreset,
		selectedScaling,
		selectedTouchLayoutOption,
		previewLayout,
		hasPrevious,
		hasNext,
		gotoPage,
		onPrevious,
		onNext,
		onMenu,
		siteConfig,
	}: Props = $props();

	let visiblePage = $state(1);

	let blockScrollingNavigation = $state(false);

	let containers: HTMLDivElement[] = $state([]);

	let clientWidth = $state<number>();
	let clientHeight = $state(0);

	let hasWidth = $state(false);

	let scrollContainer: HTMLDivElement;
	// svelte-ignore non_reactive_update
	let navContainer: HTMLDivElement;
	let endContainer: HTMLDivElement;

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

	$effect(() => {
		getCurrentContainer(clientHeight);
	});

	$effect(() => {
		if (clientWidth !== undefined) {
			hasWidth = true;
		}
	});
</script>

<div
	bind:this={scrollContainer}
	class="relative h-full w-full overflow-y-auto"
	onscroll={onScroll}
	bind:clientHeight
	bind:clientWidth
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
					src={getImageUrl(image.pageNumber, gallery, selectedPreset, siteConfig.imageServer)}
					in:fade={{ duration: 100 }}
				/>
			{/if}
		</div>
	{/each}

	<div bind:this={endContainer} class="relative h-[40dvh] w-full">
		<div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-neutral-200">
			<p class="text-2xl font-medium">End of chapter</p>
			<Button class="z-50" href="/g/{gallery.id}{page.url.search}" variant="outline">
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
		bind:ref={navContainer}
	/>
</div>
