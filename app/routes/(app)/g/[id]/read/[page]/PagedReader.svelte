<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { appState } from '$lib/stores.svelte';
	import type { Gallery, Image } from '$lib/types';
	import { cn, getImageDimensions, getImageUrl } from '$lib/utils';
	import ChapterEndToast from './ChapterEndToast.svelte';
	import TouchNavigation from './TouchNavigation.svelte';
	import type { Scaling, ScalingOption, TouchLayoutOption } from './reader.svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { ReaderPreset } from '~shared/config/image.schema';

	type Props = {
		gallery: Gallery;
		currentPage: number;
		minWidth: number;
		maxWidth: number;
		selectedPreset?: ReaderPreset;
		selectedScalingOption: ScalingOption;
		selectedTouchLayoutOption: TouchLayoutOption;
		previewLayout: boolean;
		hasPrevious: boolean;
		hasNext: boolean;
		toolbarPosition: 'top' | 'bottom';
		onPrevious: () => void;
		onNext: () => void;
		onMenu: (value?: boolean) => void;
	};

	let {
		gallery,
		currentPage,
		minWidth,
		maxWidth,
		selectedPreset,
		selectedScalingOption,
		selectedTouchLayoutOption,
		previewLayout,
		hasPrevious,
		hasNext,
		toolbarPosition,
		onPrevious,
		onNext,
		onMenu,
	}: Props = $props();

	let isMounted = $state(false);

	const currentImage = $derived(gallery.images[currentPage - 1]!);

	const selectedScaling = $derived(selectedScalingOption.value);

	const imageWidth = $derived(selectedPreset?.width ?? currentImage.width);
	const imageHeight = $derived(
		selectedPreset?.width
			? Math.round((selectedPreset?.width * currentImage.height!) / currentImage.width!)
			: currentImage.height
	);

	const imageUrl = $derived(
		getImageUrl(currentPage, gallery, selectedPreset, appState.siteConfig.imageServer)
	);

	let scrollContainer: HTMLDivElement;
	// svelte-ignore non_reactive_update
	let navContainer: HTMLDivElement;
	let imageElement: HTMLImageElement;

	const imageStatus = $derived(gallery.images.map((image) => ({ ...image, status: 'idle' })));

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
			imageEl.src = getImageUrl(image.pageNumber, gallery, preset, appState.siteConfig.imageServer);
		}
	}

	onMount(() => {
		isMounted = true;
		setPosition();
	});

	$effect(() => {
		if (selectedScaling) {
			scrollContainer?.scrollTo({ top: 0, behavior: 'instant' });
		}
	});

	$effect(() => {
		if (isMounted) {
			preloadPages(currentPage, selectedPreset);
		}
	});
</script>

<div
	bind:this={scrollContainer}
	class="relative w-full overflow-auto"
	onscroll={() => setPosition()}
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
		bind:ref={navContainer}
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
							goto(`/g/${gallery.id}${page.url.search}`);
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
