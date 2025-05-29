<script lang="ts">
	import { page } from '$app/stores';
	import { siteConfig } from '$lib/stores';
	import { cn, isSpread } from '$lib/utils';
	import type { Gallery } from '../types';
	import { Button } from './ui/button';

	export let archive: Gallery;

	let maxCount = 12;

	$: filteredImages = archive?.images.slice(0, maxCount);

	$: wideImages =
		archive.images.reduce(
			(acc, image) => acc + (image.width && image.height ? image.width / image.height : 0),
			0
		) /
			archive.images.length >=
		1;
</script>

<div class="flex-grow space-y-2">
	<div class="@container">
		<div class="grid grid-cols-2 gap-2 @2xl:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-6">
			{#each filteredImages as image (image.pageNumber)}
				<a class="relative" href={`./${archive.id}/read/${image.pageNumber}${$page.url.search}`}>
					<img
						class={cn(
							'aspect-[45/64] h-full w-full rounded-md bg-neutral-800 object-contain shadow-md shadow-shadow',
							isSpread(image) && 'object-contain'
						)}
						alt={`Page ${image.pageNumber}`}
						height={455}
						loading="eager"
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

	{#if filteredImages.length < archive.images.length}
		<div class="grid grid-cols-2 gap-2">
			<Button variant="indigo-outline" on:click={() => (maxCount += 12)}>Show more</Button>
			<Button variant="blue-outline" on:click={() => (maxCount = archive.images.length)}>
				Show all
			</Button>
		</div>
	{/if}
</div>
