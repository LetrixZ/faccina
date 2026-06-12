<script lang="ts">
	import { page } from '$app/state';
	import { cn, isSpread } from '$lib/utils.js';
	import type { Gallery } from '../types.js';
	import { Button } from './ui/button/index.js';
	import { onMount } from 'svelte';

	let {
		gallery,
		galleryPreviewsCount,
		galleryShowAllPreviews,
		galleryAutoLoadMorePreviews,
		imageServer
	}: {
		gallery: Gallery;
		galleryPreviewsCount: number;
		galleryShowAllPreviews: boolean;
		galleryAutoLoadMorePreviews: boolean;
		imageServer: string;
	} = $props();

	let buttonsContainer: HTMLDivElement | null = $state(null);

	let maxCount = $derived(galleryPreviewsCount);

	const filteredImages = $derived(
		galleryShowAllPreviews ? gallery.images : gallery.images.slice(0, maxCount)
	);

	const wideImages = $derived(
		gallery.images.reduce(
			(acc, image) => acc + (image.width && image.height ? image.width / image.height : 0),
			0
		) /
			gallery.images.length >=
			1
	);

	const checkVisibility = () => {
		if (!galleryAutoLoadMorePreviews || !buttonsContainer) {
			return;
		}

		const rect = buttonsContainer.getBoundingClientRect();
		const isInViewport =
			rect.top >= 0 &&
			rect.left >= 0 &&
			rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
			rect.right <= (window.innerWidth || document.documentElement.clientWidth);

		if (isInViewport && maxCount < gallery.images.length) {
			maxCount += galleryPreviewsCount;
			setTimeout(checkVisibility, 100);
		}
	};

	onMount(() => {
		checkVisibility();
	});
</script>

<svelte:window onresize={checkVisibility} onscroll={checkVisibility} />

<div class="grow space-y-2">
	<div class="@container">
		<div class="grid grid-cols-2 gap-2 @2xl:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-6">
			{#each filteredImages as image (image.pageNumber)}
				<a class="relative" href={`./${gallery.id}/read/${image.pageNumber}${page.url.search}`}>
					<img
						alt={`Page ${image.pageNumber}`}
						class={cn(
							'aspect-45/64 h-full w-full rounded-md bg-neutral-800 object-contain shadow-md shadow-shadow',
							isSpread(image) && 'object-contain'
						)}
						height={455}
						loading="lazy"
						src={`${imageServer}/image/${gallery.hash}/${image.pageNumber}?type=thumb`}
						width={320}
					/>
					{#if !wideImages && isSpread(image)}
						<span
							class="absolute bottom-2 right-2 rounded-md bg-muted px-1 py-0.5 text-xs font-medium uppercase tracking-wide opacity-90"
						>
							Spread
						</span>
					{/if}
				</a>
			{/each}
		</div>
	</div>

	{#if !galleryShowAllPreviews}
		{#if filteredImages.length < gallery.images.length}
			<div bind:this={buttonsContainer} class="grid grid-cols-2 gap-2">
				<Button onclick={() => (maxCount += galleryPreviewsCount)} variant="indigo-outline">
					Show more
				</Button>
				<Button onclick={() => (maxCount = gallery.images.length)} variant="blue-outline">
					Show all
				</Button>
			</div>
		{/if}
	{/if}
</div>
