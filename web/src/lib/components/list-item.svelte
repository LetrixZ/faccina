<script lang="ts">
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { Button } from '$ui/button';
	import { TagType, type ArchiveListItem, type Taxonomy } from '$lib/models';
	import { tagWeights, tagsExcludeCount, tagsExcludeDisplay } from '$lib/utils';
	import pixelWidth from 'string-pixel-width';
	import ChipList from './chip-list.svelte';
	import GalleryCover from './gallery-cover.svelte';

	export let archive: ArchiveListItem;

	$: [reducedTags, moreCount] = (() => {
		const maxWidth = 290;

		const tags = [
			...(archive.artists ? archive.artists.map((tag) => ({ ...tag, type: TagType.ARTIST })) : []),
			...(archive.circles ? archive.circles.map((tag) => ({ ...tag, type: TagType.CIRCLE })) : []),
			...(archive.parodies
				? archive.parodies
						.map((tag) => ({ ...tag, type: TagType.PARODY }))
						.filter((tag) => !['original-work', 'original'].includes(tag.slug))
				: []),
			...(archive.tags
				? archive.tags
						.map((tag) => ({ ...tag, type: TagType.TAG }))
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

		const reduced: (Taxonomy & { type: TagType })[] = [];

		for (const tag of tags) {
			if (reduced.find((t) => t.name === tag.name)) {
				continue;
			}

			if (tag.type === TagType.CIRCLE && tag.name.length > 20) {
				continue;
			}

			if (width < maxWidth) {
				const tagWidth = 12 + pixelWidth(tag.name, { font: 'inter', size: 12 });

				if (tag.type === TagType.TAG && tagsExcludeDisplay.includes(tag.name.toLowerCase())) {
					continue;
				}

				width += tagWidth;
				reduced.push(tag);
				tagCount--;
			}
		}

		return [reduced, tagCount];
	})();

	$: artists = reducedTags.filter((tag) => tag.type === TagType.ARTIST);
	$: circles = reducedTags.filter((tag) => tag.type === TagType.CIRCLE);
	$: parodies = reducedTags.filter((tag) => tag.type === TagType.PARODY);
	$: tags = reducedTags.filter((tag) => tag.type === TagType.TAG);
</script>

<div class="group h-auto w-auto space-y-2">
	<div class="w-full">
		<a href={`/g/${archive.id}${$page.url.search}`} tabindex="-1" class="relative">
			{#if archive.pages}
				<div
					class="absolute end-0 top-0 m-1.5 rounded-md bg-muted p-1 text-xs font-bold leading-none text-white opacity-75"
				>
					{archive.pages}P
				</div>
			{/if}
			<GalleryCover
				{archive}
				cover={archive.cover}
				src={`${env.PUBLIC_CDN_URL}/image/${archive.hash}/${archive.thumbnail}/c`}
			/>
		</a>
	</div>

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
				<ChipList item={artist} type={TagType.ARTIST} />
			{/each}

			{#each circles as circle}
				<ChipList item={circle} type={TagType.CIRCLE} />
			{/each}

			{#each parodies as parody}
				<ChipList item={parody} type={TagType.PARODY} />
			{/each}

			{#each tags as tag}
				<ChipList item={tag} type={TagType.TAG} />
			{/each}

			{#if moreCount}
				<Button
					class={'h-fit w-fit px-1.5 py-0.5 text-xs font-semibold text-neutral-50 dark:text-neutral-200'}
					variant="secondary"
				>
					+ {moreCount}
				</Button>
			{/if}
		</div>
	</div>
</div>
