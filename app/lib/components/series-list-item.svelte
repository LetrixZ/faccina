<script lang="ts">
	import pixelWidth from 'string-pixel-width';
	import type { SeriesListItem, SiteConfig, Tag } from '../types';
	import Chip from './chip.svelte';
	import { Button } from './ui/button';

	type Props = {
		series: SeriesListItem;
		siteConfig: SiteConfig;
	};

	let { series, siteConfig }: Props = $props();

	const { tags, moreCount } = $derived.by(() => {
		const tags = series.tags;

		const maxWidth = 290;

		let moreCount = tags.length;
		let width = 0;

		const reduced: Tag[] = [];

		for (const tag of tags) {
			if (reduced.find((t) => t.name === tag.name)) {
				continue;
			}

			if (tag.namespace === 'tag' && tag.name.length > 20) {
				continue;
			}

			if (width < maxWidth) {
				const tagWidth = 12 + pixelWidth(tag.name, { font: 'inter', size: 12 });

				width += tagWidth;
				reduced.push(tag);
				moreCount--;
			}
		}

		return { tags: reduced, moreCount };
	});
</script>

<div class="group h-auto w-auto space-y-2">
	<a href="/series/{series.id}">
		<div class="relative overflow-clip rounded-md shadow">
			<img
				class="aspect-[45/64] bg-neutral-800 object-contain"
				alt="'{series.title}' cover"
				height={910}
				loading="eager"
				src={`${siteConfig.imageServer}/image/${series.hash}/${series.thumbnail}?type=cover`}
				width={640}
			/>

			<div class="absolute end-1 bottom-1 flex gap-1">
				<div class="w-fit rounded-md bg-neutral-900 p-1 text-xs font-bold text-white opacity-70">
					{series.chapterCount}C
				</div>
			</div>
		</div>
	</a>

	<div class="h-fit space-y-1.5">
		<a
			class="focus-visible:text-foreground group-hover:text-foreground line-clamp-2 pe-2 leading-6 font-medium underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
			href="/series/{series.id}"
			target="_blank"
			title={series.title}
		>
			{series.title}
		</a>

		<div class="flex flex-wrap gap-1.5">
			{#each tags as tag}
				<Chip {tag} />
			{/each}

			{#if moreCount}
				<Button
					class="h-6 w-fit px-1.5 py-0 text-xs font-semibold text-neutral-50 dark:text-neutral-200"
					variant="secondary"
				>
					+ {moreCount}
				</Button>
			{/if}
		</div>
	</div>
</div>
