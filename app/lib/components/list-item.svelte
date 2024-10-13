<script lang="ts">
	import { page } from '$app/stores';
	import { type ArchiveListItem, type Tag, type TagType } from '$lib/models';
	import { tagsExcludeCount, tagsExcludeDisplay, tagWeights } from '$lib/utils';
	import { EyeOff } from 'lucide-svelte';
	import pixelWidth from 'string-pixel-width';

	import Chip from './chip.svelte';
	import { Button } from './ui/button';

	export let archive: ArchiveListItem;

	$: [reducedTags, moreCount] = (() => {
		const maxWidth = 290;

		const tags = [
			...(archive.artists
				? archive.artists.map((tag) => ({ ...tag, type: 'artist' as TagType }))
				: []),
			...(archive.circles
				? archive.circles.map((tag) => ({ ...tag, type: 'circle' as TagType }))
				: []),
			...(archive.parodies
				? archive.parodies
						.map((tag) => ({ ...tag, type: 'parody' as TagType }))
						.filter((tag) => !['original-work', 'original'].includes(tag.slug))
				: []),
			...(archive.tags
				? archive.tags
						.map((tag) => ({ ...tag, type: 'tag' as TagType }))
						.filter((tag) => !tagsExcludeCount.includes(tag.name.toLowerCase()))
						.sort((a, b) => {
							const aWeight = tagWeights.find(([tag]) => tag === a.name.toLowerCase())?.[1] ?? 0;
							const bWeight = tagWeights.find(([tag]) => tag === b.name.toLowerCase())?.[1] ?? 0;

							if (aWeight === bWeight) {
								return a.name.length - b.name.length;
							}

							return bWeight - aWeight;
						})
				: []),
		];

		let tagCount = tags.length;
		let width = 0;

		const reduced: (Tag & { type: TagType })[] = [];

		for (const tag of tags) {
			if (reduced.find((t) => t.name === tag.name)) {
				continue;
			}

			if (tag.type === 'tag' && tag.name.length > 20) {
				continue;
			}

			if (width < maxWidth) {
				const tagWidth = 12 + pixelWidth(tag.name, { font: 'inter', size: 12 });

				if (tag.type === 'tag' && tagsExcludeDisplay.includes(tag.name.toLowerCase())) {
					continue;
				}

				width += tagWidth;
				reduced.push(tag);
				tagCount--;
			}
		}

		return [reduced, tagCount];
	})();

	$: artists = reducedTags.filter((tag) => tag.type === 'artist');
	$: circles = reducedTags.filter((tag) => tag.type === 'circle');
	$: parodies = reducedTags.filter((tag) => tag.type === 'parody');
	$: tags = reducedTags.filter((tag) => tag.type === 'tag');
</script>

<div class="group h-auto w-auto space-y-2">
	<a href={`/g/${archive.id}${$page.url.search}`} tabindex="-1">
		<div class="relative overflow-clip rounded-md shadow">
			<img
				alt={`'${archive.title}' cover`}
				class="aspect-[45/64] bg-neutral-800 object-contain"
				height={910}
				loading="eager"
				src={`/image/${archive.hash}/${archive.thumbnail}?type=cover`}
				width={640}
			/>
			<div class="absolute bottom-1 end-1 flex gap-1">
				{#if archive.deleted_at}
					<div
						class="flex aspect-square size-6 items-center justify-center rounded-md bg-slate-700 p-1 text-xs font-bold text-white opacity-85"
					>
						<EyeOff class="size-3.5" />
					</div>
				{/if}
				<div class="w-fit rounded-md bg-neutral-900 p-1 text-xs font-bold text-white opacity-70">
					{archive.pages}P
				</div>
			</div>
		</div>
	</a>

	<div class="h-fit space-y-1.5">
		<a
			class="line-clamp-2 pe-2 font-medium leading-6 underline-offset-4 hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none group-hover:text-foreground"
			href={`/g/${archive.id}${$page.url.search}`}
			title={archive.title}
		>
			{archive.title}
		</a>

		<div class="flex flex-wrap gap-1.5">
			{#each artists as artist}
				<Chip tag={artist} type="artist" />
			{/each}

			{#each circles as circle}
				<Chip tag={circle} type="circle" />
			{/each}

			{#each parodies as parody}
				<Chip tag={parody} type="parody" />
			{/each}

			{#each tags as tag}
				<Chip {tag} type="tag" />
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
