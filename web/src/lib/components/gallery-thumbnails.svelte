<script lang="ts">
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import type { Archive } from '$lib/models';
	import { cn, isSpread } from '$lib/utils';
	import { Button } from './ui/button';

	export let archive: Archive;

	let maxCount = 12;

	$: filteredImages = archive?.images.slice(0, maxCount);

	$: wideImages =
		archive.images.reduce((acc, image) => acc + image.width / image.height, 0) /
			archive.images.length >=
		1;
</script>

<div class="flex-grow space-y-2">
	<div class="@container">
		<div class="@2xl:grid-cols-3 3xl:grid-cols-6 grid grid-cols-2 gap-2 xl:grid-cols-4">
			{#each filteredImages as image (image.page_number)}
				<a class="relative" href={`./${archive.id}/read/${image.page_number}${$page.url.search}`}>
					<img
						class={cn(
							'shadow-shadow h-full w-full rounded-md bg-neutral-300 shadow-md dark:bg-neutral-600',
							isSpread(image) && 'object-contain'
						)}
						width={320}
						height={Math.round((320 / image.width) * image.height)}
						loading="eager"
						alt={`Page ${image.page_number}`}
						src={`${env.PUBLIC_CDN_URL}/image/${archive.hash}/${image.page_number}/thumb`}
					/>
					{#if !wideImages && isSpread(image)}
						<span
							class="bg-muted absolute bottom-2 right-2 rounded-md px-1 py-0.5 text-xs font-medium uppercase tracking-wide opacity-90"
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
