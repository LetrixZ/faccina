<script lang="ts">
	import { page } from '$app/stores';
	import pixelWidth from 'string-pixel-width';
	import type { SeriesListItem, Tag } from '../types';
	import Chip from './chip.svelte';
	import { Button } from './ui/button';

	export let series: SeriesListItem;

	$: [reducedTags, moreCount] = (() => {
		const tags = series.tags;

		const maxWidth = 290;

		let tagCount = tags.length;
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
				tagCount--;
			}
		}

		return [reduced, tagCount];
	})();

	$: tags = reducedTags;
</script>

<div class="group h-auto w-auto space-y-2">
	<a href="/series/{series.id}">
		<div class="relative overflow-clip rounded-md shadow">
			<img
				alt="'{series.title}' cover"
				class="aspect-[45/64] bg-neutral-800 object-contain"
				height={910}
				loading="eager"
				src="/image/{series.hash}/{series.thumbnail}?type=cover"
				width={640}
			/>

			<div class="absolute bottom-1 end-1 flex gap-1">
				<div class="w-fit rounded-md bg-neutral-900 p-1 text-xs font-bold text-white opacity-70">
					{series.chapterCount}C
				</div>
			</div>
		</div>
	</a>

	<div class="h-fit space-y-1.5">
		<a
			class="line-clamp-2 pe-2 font-medium leading-6 underline-offset-4 hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none group-hover:text-foreground"
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
					class={'h-6 w-fit px-1.5 py-0 text-xs font-semibold text-neutral-50 dark:text-neutral-200'}
					variant="secondary"
				>
					+ {moreCount}
				</Button>
			{/if}
		</div>
	</div>
</div>
