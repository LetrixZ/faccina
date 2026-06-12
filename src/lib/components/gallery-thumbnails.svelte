<script lang="ts">
	import { onMount } from 'svelte';
	import type { Gallery } from '../types';
	import { Button } from './ui/button';
	import { page } from '$app/stores';
	import { siteConfig } from '$lib/stores';
	import { cn, isSpread } from '$lib/utils';

	export let archive: Gallery;

	let buttonsContainer: HTMLDivElement | null;

	let maxCount = $siteConfig.galleryPreviewsCount;

	$: filteredImages = $siteConfig.galleryShowAllPreviews
		? archive.images
		: archive?.images.slice(0, maxCount);

	$: wideImages =
		archive.images.reduce(
			(acc, image) => acc + (image.width && image.height ? image.width / image.height : 0),
			0
		) /
			archive.images.length >=
		1;

	const checkVisibility = () => {
		if (!$siteConfig.galleryAutoLoadMorePreviews || !buttonsContainer) {
			return;
		}

		const rect = buttonsContainer.getBoundingClientRect();
		const isInViewport =
			rect.top >= 0 &&
			rect.left >= 0 &&
			rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
			rect.right <= (window.innerWidth || document.documentElement.clientWidth);

		if (isInViewport && maxCount < archive.images.length) {
			maxCount += $siteConfig.galleryPreviewsCount;
			setTimeout(checkVisibility, 100);
		}
	};

	onMount(() => {
		checkVisibility();
	});
</script>

<svelte:window on:resize={checkVisibility} on:scroll={checkVisibility} />

<div class="flex-grow space-y-2">
	<div class="@container">
		<div class="grid grid-cols-2 gap-2 @2xl:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-6">
			{#each filteredImages as image (image.pageNumber)}
				<a class="relative" href={`./${archive.id}/read/${image.pageNumber}${$page.url.search}`}>
					<img
						alt={`Page ${image.pageNumber}`}
						class={cn(
							'aspect-[45/64] h-full w-full rounded-md bg-neutral-800 object-contain shadow-md shadow-shadow',
							isSpread(image) && 'object-contain'
						)}
						height={455}
						loading="lazy"
						src={`${$siteConfig.imageServer}/image/${archive.hash}/${image.pageNumber}?type=thumb`}
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

	{#if !$siteConfig.galleryShowAllPreviews}
		{#if filteredImages.length < archive.images.length}
			<div bind:this={buttonsContainer} class="grid grid-cols-2 gap-2">
				<Button on:click={() => (maxCount += $siteConfig.galleryPreviewsCount)} variant="indigo-outline">
					Show more
				</Button>
				<Button on:click={() => (maxCount = archive.images.length)} variant="blue-outline">
					Show all
				</Button>
			</div>
		{/if}
	{/if}
</div>
