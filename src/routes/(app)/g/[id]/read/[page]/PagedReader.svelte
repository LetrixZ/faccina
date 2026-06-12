<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import ChapterEndToast from './ChapterEndToast.svelte';
	import type { Scaling, ScalingOption, TouchLayoutOption } from './reader';
	import TouchNavigation from './TouchNavigation.svelte';
	import { siteConfig } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Gallery, Image } from '$lib/types';
	import { cn, getImageDimensions, getImageUrl } from '$lib/utils';
	import type { ReaderPreset } from '~shared/config/image.schema';

	export let gallery: Gallery;

	export let currentPage: number;

	export let minWidth: number;
	export let maxWidth: number;

	export let selectedPreset: ReaderPreset | undefined;
	export let selectedScalingOption: ScalingOption;
	export let selectedTouchLayoutOption: TouchLayoutOption;

	export let previewLayout: boolean;

	export let hasPrevious: boolean;
	export let hasNext: boolean;

	export let toolbarPosition: 'top' | 'bottom';

	export let onPrevious: () => void;
	export let onNext: () => void;
	export let onMenu: (value?: boolean) => void;

	let isMounted = false;

	$: currentImage = gallery.images[currentPage - 1]!;

	$: selectedScaling = selectedScalingOption.value;

	$: imageWidth = selectedPreset?.width ?? currentImage.width;
	$: imageHeight = selectedPreset?.width
		? Math.round((selectedPreset?.width * currentImage.height!) / currentImage.width!)
		: currentImage.height;

	$: imageUrl = getImageUrl(currentPage, gallery, selectedPreset, $siteConfig.imageServer);

	let scrollContainer: HTMLDivElement;
	let navContainer: HTMLDivElement;
	let imageElement: HTMLImageElement;

	let imageStatus = gallery.images.map((image) => ({ ...image, status: 'idle' }));

	function setPosition() {
		if (!navContainer || !scrollContainer) {
			return;
		}

		navContainer.style.top = `${scrollContainer.scrollTop}px`;
	}

	function getStyle(
		image: Image,
		preset: ReaderPreset | undefined,
		scaling: Scaling,
		minWidth: number,
		maxWidth: number
	) {
		const { width } = getImageDimensions(image, preset);

		switch (scaling) {
			case 'original':
				return `${minWidth ? `width: max(${minWidth}px, ${width}px)` : `width: ${width}px;`}; max-width: ${maxWidth ? `min(${maxWidth}px, 100%)` : '100%'};`;
			case 'fill-width':
				return `width: 100%;`;
			case 'fill-height':
				return ``;
		}
	}

	function getImageStyle(
		image: Image,
		preset: ReaderPreset | undefined,
		scaling: Scaling,
		minWidth: number,
		maxWidth: number
	) {
		const { width } = getImageDimensions(image, preset);

		switch (scaling) {
			case 'original': {
				let base = `max-width: ${maxWidth ? `min(${maxWidth}px, 100%)` : '100%'};`;

				if (minWidth) {
					return `${base} ${minWidth ? `width: max(${minWidth}px, ${width}px)` : `width: ${width}px;`};`;
				}

				return base;
			}
			case 'fill-width':
				return 'width: 100%;';
			case 'fill-height':
				return 'height: 100%; width: auto;';
		}
	}

	async function preloadPages(currentPage: number, preset: ReaderPreset | undefined) {
		imageStatus.find((image) => image.pageNumber === currentPage)!.status = 'loaded';

		const startPage = currentPage - 1;
		const endPage = currentPage + 4;

		const imagesToLoad = imageStatus.filter(
			(image) =>
				image.status === 'idle' && image.pageNumber >= startPage && image.pageNumber < endPage
		);

		for (const image of imagesToLoad) {
			image.status = 'loading';

			const { width, height } = getImageDimensions(image, preset);

			const imageEl = new Image(width, height);
			imageEl.onload = () => (image.status = 'loaded');
			imageEl.onerror = () => (image.status = 'loaded');
			imageEl.src = getImageUrl(image.pageNumber, gallery, preset, $siteConfig.imageServer);
		}
	}

	onMount(() => {
		isMounted = true;
		setPosition();
	});

	$: {
		if (selectedScaling) {
			scrollContainer?.scrollTo({ top: 0, behavior: 'instant' });
		}
	}

	$: {
		if (isMounted) {
			preloadPages(currentPage, selectedPreset);
		}
	}
</script>

<div
	bind:this={scrollContainer}
	class="relative w-full overflow-auto"
	on:scroll={() => setPosition()}
>
	<div
		class={cn(
			'relative mx-auto flex',
			(selectedScaling === 'original' || selectedScaling === 'fill-height') && 'h-full w-fit',
			selectedScaling === 'fill-width' && 'w-full',
			selectedScaling === 'fill-height' && 'h-full'
		)}
		style={getStyle(currentImage, selectedPreset, selectedScaling, minWidth, maxWidth)}
	>
		<img
			alt="{gallery.title} page {currentPage}"
			bind:this={imageElement}
			class={cn(
				(selectedScaling === 'original' || selectedScaling === 'fill-height') && 'my-auto w-fit',
				selectedScaling === 'fill-width' && 'w-full',
				selectedScaling === 'fill-height' && 'h-full max-h-dvh object-contain'
			)}
			height={imageHeight}
			src={imageUrl}
			style={getImageStyle(currentImage, selectedPreset, selectedScaling, minWidth, maxWidth)}
			width={imageWidth}
		/>
	</div>

	<TouchNavigation
		bind:navContainer
		hasNext={true}
		{hasPrevious}
		{onMenu}
		onNext={() => {
			if (hasNext) {
				onNext();
				setPosition();
				scrollContainer.scrollTo({ top: 0 });
			} else {
				onMenu(true);
				toast(ChapterEndToast, {
					id: 'end-chapter',
					position: toolbarPosition === 'top' ? 'bottom-center' : 'top-center',
					componentProps: {
						gallery,
						onBack: () => {
							goto(`/g/${gallery.id}${$page.url.search}`);
							toast.dismiss('end-chapter');
						},
					},
				});
			}
		}}
		onPrevious={() => {
			onPrevious();
			setPosition();
			scrollContainer.scrollTo({ top: 0 });
		}}
		{previewLayout}
		{selectedTouchLayoutOption}
	/>
</div>
