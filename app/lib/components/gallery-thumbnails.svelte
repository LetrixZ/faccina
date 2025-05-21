<script lang="ts">
	import { page } from '$app/state';
	import { cn, isSpread } from '$lib/utils';
	import type { Gallery, SiteConfig } from '../types';
	import { Button } from './ui/button';

	type Props = {
		archive: Gallery;
		siteConfig: SiteConfig;
	};

	let { archive, siteConfig }: Props = $props();

	let maxCount = $state(12);

	const filteredImages = $derived(archive?.images.slice(0, maxCount));

	const wideImages = $derived(
		archive.images.reduce(
			(acc, image) => acc + (image.width && image.height ? image.width / image.height : 0),
			0
		) /
			archive.images.length >=
			1
	);
</script>

<div class="flex-grow space-y-2">
	<div class="@container">
		<div class="3xl:grid-cols-6 grid grid-cols-2 gap-2 xl:grid-cols-4 @2xl:grid-cols-3">
			{#each filteredImages as image (image.pageNumber)}
				<a class="relative" href="./{archive.id}/read/{image.pageNumber}{page.url.search}">
					<img
						class={cn(
							'shadow-shadow aspect-[45/64] h-full w-full rounded-md bg-neutral-800 object-contain shadow-md',
							isSpread(image) && 'object-contain'
						)}
						alt="Page {image.pageNumber}"
						height={455}
						loading="eager"
						src="{siteConfig.imageServer}/image/{archive.hash}/{image.pageNumber}?type=thumb"
						width={320}
					/>
					{#if !wideImages && isSpread(image)}
						<span
							class="absolute right-2 bottom-2 rounded-md bg-muted px-1 py-0.5 text-xs font-medium tracking-wide uppercase opacity-90"
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
			<Button onclick={() => (maxCount += 12)} variant="indigo-outline">Show more</Button>
			<Button onclick={() => (maxCount = archive.images.length)} variant="blue-outline">
				Show all
			</Button>
		</div>
	{/if}
</div>
