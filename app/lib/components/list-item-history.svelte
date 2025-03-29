<script lang="ts">
	import { page } from '$app/state';
	import { appState } from '$lib/stores.svelte';
	import { cn, relativeDate } from '$lib/utils';
	import type { HistoryEntry, Tag } from '../types';
	import Chip from './chip.svelte';
	import Button from './ui/button/button.svelte';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import BookOpenCheck from '@lucide/svelte/icons/book-open-check';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import dayjs from 'dayjs';
	import pixelWidth from 'string-pixel-width';

	type Props = {
		entry: HistoryEntry;
		enableBookmark?: boolean;
		bookmarked?: boolean;
		imageBookmark?: boolean;
		newTab?: boolean;
		onBookmark?: (bookmark: boolean) => void;
	};

	let {
		entry,
		enableBookmark = false,
		bookmarked = false,
		imageBookmark = false,
		newTab = false,
		onBookmark,
	}: Props = $props();

	const { tags, moreCount } = $derived.by(() => {
		const maxWidth = 290;

		const tags = entry.archive.tags;

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

<div class="group bg-background/70 relative flex justify-between gap-2 rounded pe-6">
	<a
		href="/g/{entry.archive.id}{page.url.search}"
		tabindex="-1"
		{...newTab && { target: '_blank' }}
		class="flex-shrink-0"
		onclick={(ev) => {
			if (enableBookmark && imageBookmark) {
				ev.preventDefault();
				onBookmark?.(!bookmarked);
			}
		}}
	>
		<div class="relative max-w-24 overflow-clip rounded-md shadow md:max-w-32">
			<img
				alt="'{entry.archive.title}' cover"
				class="aspect-[45/64] bg-neutral-800 object-contain"
				height={910}
				loading="eager"
				src="{appState.siteConfig.imageServer}/image/{entry.archive.hash}/{entry.archive
					.thumbnail}?type=cover"
				width={640}
			/>

			{#if enableBookmark}
				<div class={cn('absolute end-1 top-1 hidden group-hover:block', bookmarked && 'block')}>
					<button
						class={cn(
							'flex size-9 items-center justify-center rounded-md bg-indigo-700 p-2 opacity-85 hover:opacity-95 active:opacity-100',
							bookmarked && 'opacity-90'
						)}
						onclick={(ev) => {
							ev.preventDefault();
							ev.stopPropagation();
							onBookmark?.(!bookmarked);
						}}
					>
						<Bookmark class={cn(bookmarked && 'fill-white')} />
					</button>
				</div>
			{/if}
			<div class="absolute end-1 bottom-1 flex gap-1">
				{#if entry.archive.deletedAt}
					<div
						class="flex aspect-square size-6 items-center justify-center rounded-md bg-slate-700 p-1 text-xs font-bold text-white opacity-85"
					>
						<EyeOff class="size-3.5" />
					</div>
				{/if}
				<div class="w-fit rounded-md bg-neutral-900 p-1 text-xs font-bold text-white opacity-70">
					{entry.archive.pages}P
				</div>
			</div>
		</div>
	</a>

	<div class="h-fit flex-auto space-y-1.5">
		<a
			class="focus-visible:text-foreground group-hover:text-foreground line-clamp-2 pe-2 leading-6 font-medium underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
			href="/g/{entry.archive.id}{page.url.search}"
			title={entry.archive.title}
			{...newTab && { target: '_blank' }}
		>
			{entry.archive.title}
		</a>

		<div class="flex flex-wrap gap-1.5">
			{#each tags as tag}
				<Chip {newTab} {tag} />
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
					href="/g/{entry.archive.id}/read/{entry.lastPage}{page.url.search}"
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
