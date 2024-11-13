<script lang="ts">
	import { preventDefault, stopPropagation } from 'svelte/legacy';

	import dayjs from 'dayjs';
	import { Bookmark, BookOpen, BookOpenCheck, EyeOff } from 'lucide-svelte';
	import pixelWidth from 'string-pixel-width';
	import { createEventDispatcher } from 'svelte';
	import type { HistoryEntry, Tag } from '../types';
	import Chip from './chip.svelte';
	import Button from './ui/button/button.svelte';
	import { cn, isTag, relativeDate } from '$lib/utils';
	import { page } from '$app/stores';

	interface Props {
		entry: HistoryEntry;
		enableBookmark?: boolean;
		bookmarked?: boolean;
		imageBookmark?: boolean;
		newTab?: boolean;
	}

	let {
		entry,
		enableBookmark = false,
		bookmarked = false,
		imageBookmark = false,
		newTab = false
	}: Props = $props();

	let gallery = $derived(entry.archive);

	const dispatch = createEventDispatcher<{ bookmark: boolean; dropItem: [number, number] }>();

	let [reducedTags, moreCount] = $derived((() => {
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
	})());

	let artists = $derived(reducedTags.filter((tag) => tag.namespace === 'artist'));
	let circles = $derived(reducedTags.filter((tag) => tag.namespace === 'circle'));
	let parodies = $derived(reducedTags.filter((tag) => tag.namespace === 'parody'));
	let tags = $derived(reducedTags.filter((tag) => isTag(tag)));
</script>

<div class="group relative flex justify-between gap-2 rounded bg-background/70 pe-6">
	<a
		href={`/g/${gallery.id}${$page.url.search}`}
		tabindex="-1"
		{...newTab && { target: '_blank' }}
		class="flex-shrink-0"
		onclick={(ev) => {
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
						onclick={stopPropagation(preventDefault(() => {
							dispatch('bookmark', !bookmarked);
						}))}
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

		<div class="space-y-1">
			<p class="flex items-center gap-1 text-sm font-medium">
				<BookOpen class="size-4" />
				<span>
					Started {relativeDate(entry.startedAt).toLowerCase()} at {dayjs(entry.startedAt).format(
						'HH:mm'
					)}
				</span>
			</p>

			{#if entry.finishedAt}
				<p class="flex items-center gap-1 text-sm font-medium">
					<BookOpenCheck class="size-4" />
					<span>
						Finished {relativeDate(entry.finishedAt).toLowerCase()} at {dayjs(
							entry.finishedAt
						).format('HH:mm')}
					</span>
				</p>
			{:else}
				<Button
					class="flex h-fit w-fit items-center gap-1 p-0 text-sm font-medium"
					href={`/g/${gallery.id}/read/${entry.lastPage}${$page.url.search}`}
					variant="link"
				>
					<span>
						Continue from page {entry.lastPage}
					</span>
				</Button>
			{/if}
		</div>
	</div>
</div>
