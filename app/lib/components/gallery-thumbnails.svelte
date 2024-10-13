<script lang="ts">
	import type { ArchiveDetail } from '$lib/models';

	import { page } from '$app/stores';
	import { cn, isSpread } from '$lib/utils';

	import { Button } from './ui/button';

	export let archive: ArchiveDetail;

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
			{#each filteredImages as image (image.page_number)}
				<a class="relative" href={`./${archive.id}/read/${image.page_number}${$page.url.search}`}>
					<img
						alt={`Page ${image.page_number}`}
						class={cn(
							'aspect-[45/64] h-full w-full rounded-md bg-neutral-800 object-contain shadow-md shadow-shadow',
							isSpread(image) && 'object-contain'
						)}
						height={455}
						loading="eager"
						src={`/image/${archive.hash}/${image.page_number}?type=thumb`}
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
			<Button on:click={() => (maxCount += 12)} variant="indigo-outline">Show more</Button>
			<Button on:click={() => (maxCount = archive.images.length)} variant="blue-outline">
				Show all
			</Button>
		</div>
	{/if}
</div>
