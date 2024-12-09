<script lang="ts">
	import AlignJustify from 'lucide-svelte/icons/align-justify';
	import Bookmark from 'lucide-svelte/icons/bookmark';
	import EyeOff from 'lucide-svelte/icons/eye-off';
	import pixelWidth from 'string-pixel-width';
	import { createEventDispatcher } from 'svelte';
	import { dragHandle } from 'svelte-dnd-action';
	import type { GalleryListItem, Tag } from '../types';
	import Chip from './chip.svelte';
	import Button from './ui/button/button.svelte';
	import { cn, isTag } from '$lib/utils';
	import { page } from '$app/stores';

	export let gallery: GalleryListItem;
	export let enableBookmark = false;
	export let bookmarked = false;
	export let imageBookmark = false;
	export let newTab = false;

	const dispatch = createEventDispatcher<{ bookmark: boolean; dropItem: [number, number] }>();

	$: [reducedTags, moreCount] = (() => {
		const maxWidth = 290;

		const tags = [
			...gallery.tags.filter((tag) => tag.namespace === 'artist'),
			...gallery.tags.filter((tag) => tag.namespace === 'circle'),
			...gallery.tags.filter((tag) => tag.namespace === 'parody'),
			...gallery.tags.filter((tag) => isTag(tag)),
		];

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

	$: artists = reducedTags.filter((tag) => tag.namespace === 'artist');
	$: circles = reducedTags.filter((tag) => tag.namespace === 'circle');
	$: parodies = reducedTags.filter((tag) => tag.namespace === 'parody');
	$: tags = reducedTags.filter((tag) => isTag(tag));
</script>

<div class="group relative flex justify-between gap-2 rounded bg-background/70 pe-6">
	<a
		href={`/g/${gallery.id}${$page.url.search}`}
		tabindex="-1"
		{...newTab && { target: '_blank' }}
		class="flex-shrink-0"
		on:click={(ev) => {
			if (enableBookmark && imageBookmark) {
				ev.preventDefault();
				dispatch('bookmark', !bookmarked);
			}
		}}
	>
		<div class="relative max-w-24 overflow-clip rounded-md shadow md:max-w-32">
			<img
				alt={`'${gallery.title}' cover`}
				class="aspect-[45/64] bg-neutral-800 object-contain"
				height={910}
				loading="eager"
				src={`/image/${gallery.hash}/${gallery.thumbnail}?type=cover`}
				width={640}
			/>

			{#if enableBookmark}
				<div class={cn('absolute end-1 top-1 hidden group-hover:block', bookmarked && 'block')}>
					<button
						class={cn(
							'flex size-9 items-center justify-center rounded-md bg-indigo-700 p-2 opacity-85 hover:opacity-95 active:opacity-100',
							bookmarked && 'opacity-90'
						)}
						on:click|preventDefault|stopPropagation={() => {
							dispatch('bookmark', !bookmarked);
						}}
					>
						<Bookmark class={cn(bookmarked && 'fill-white')} />
					</button>
				</div>
			{/if}
			<div class="absolute bottom-1 end-1 flex gap-1">
				{#if gallery.deletedAt}
					<div
						class="flex aspect-square size-6 items-center justify-center rounded-md bg-slate-700 p-1 text-xs font-bold text-white opacity-85"
					>
						<EyeOff class="size-3.5" />
					</div>
				{/if}
				<div class="w-fit rounded-md bg-neutral-900 p-1 text-xs font-bold text-white opacity-70">
					{gallery.pages}P
				</div>
			</div>
		</div>
	</a>

	<div class="h-fit flex-auto space-y-1.5">
		<a
			class="line-clamp-2 pe-2 font-medium leading-6 underline-offset-4 hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none group-hover:text-foreground"
			href={`/g/${gallery.id}${$page.url.search}`}
			title={gallery.title}
			{...newTab && { target: '_blank' }}
		>
			{gallery.title}
		</a>

		<div class="flex flex-wrap gap-1.5">
			{#each artists as artist}
				<Chip {newTab} tag={artist} type="artist" />
			{/each}

			{#each circles as circle}
				<Chip {newTab} tag={circle} type="circle" />
			{/each}

			{#each parodies as parody}
				<Chip {newTab} tag={parody} type="parody" />
			{/each}

			{#each tags as tag}
				<Chip {newTab} {tag} type="tag" />
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

	<div
		aria-label="Drag {gallery.title}"
		class="absolute inset-y-0 right-0 flex h-full items-center"
		use:dragHandle
	>
		<AlignJustify class="text-muted-foreground" />
	</div>
</div>
