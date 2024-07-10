<script lang="ts">
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { cn, isSpread } from '$lib/utils';
	import { Button } from '$ui/button';
	import type { Archive, Image } from '$lib/models';

	export let archive: Archive;
	export let images: Image[];

	let maxCount = 12;

	$: filteredImages = images.slice(0, maxCount);

	$: wideImages =
		images.reduce(
			(acc, image) => acc + (image.width && image.height ? image.width / image.height : 0),
			0
		) /
			images.length >=
		1;
</script>

<div class="flex-grow space-y-2">
	<div class="@container">
		<div class="@2xl:grid-cols-3 grid grid-cols-2 gap-2 xl:grid-cols-4 3xl:grid-cols-6">
			{#each filteredImages as image (image.page_number)}
				<a class="relative" href={`./${archive.id}/read/${image.page_number}${$page.url.search}`}>
					<img
						class={cn(
							'h-full w-full rounded-md bg-neutral-300 shadow-md shadow-shadow dark:bg-neutral-600',
							isSpread(image) && 'object-contain'
						)}
						width={image.width && 320}
						height={image.width && image.height && Math.round((320 / image.width) * image.height)}
						loading="eager"
						alt={`Page ${image.page_number}`}
						src={`${env.PUBLIC_CDN_URL}/image/${archive.key}/${image.page_number}/t`}
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

	{#if filteredImages.length < images.length}
		<div class="grid grid-cols-2 gap-2">
			<Button variant="indigo-outline" on:click={() => (maxCount += 12)}>Show more</Button>
			<Button variant="blue-outline" on:click={() => (maxCount = images.length)}>Show all</Button>
		</div>
	{/if}
</div>
