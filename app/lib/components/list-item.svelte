<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import BookmarkDialog from '$lib/components/bookmark-dialog.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { appState } from '$lib/stores';
	import { cn } from '$lib/utils';
	import type { GalleryListItem, ListPageType, Tag } from '../types';
	import BookmarkToast from './bookmark-toast.svelte';
	import Chip from './chip.svelte';
	import { Button } from './ui/button';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import pixelWidth from 'string-pixel-width';
	import { toast } from 'svelte-sonner';

	type Props = {
		gallery: GalleryListItem;
		enableBookmark?: boolean;
		imageBookmark?: boolean;
		newTab?: boolean;
		type: ListPageType;
		bookmarked?: boolean;
		onBookmark?: (bookmarked: boolean) => void;
	};

	let {
		gallery,
		enableBookmark = false,
		imageBookmark = false,
		newTab = false,
		type,
		bookmarked,
		onBookmark,
	}: Props = $props();

	let collectionsOpen = $state(false);
	let bookmarkGallery = $state<GalleryListItem>();

	const _bookmarked = $derived(
		bookmarked !== undefined
			? bookmarked
			: !!appState.userCollections
					?.find((c) => c.protected)
					?.archives.find((archive) => archive.id === gallery.id)
	);

	$effect(() => {
		if (!collectionsOpen) {
			bookmarkGallery = undefined;
		}
	});

	const { tags, moreCount } = $derived.by(() => {
		const tags = gallery.tags;

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

	const handleBookmark = (bookmarked: boolean) => {
		if (onBookmark) {
			onBookmark(bookmarked);
			return;
		}

		const defaultCollection = appState.userCollections?.find((c) => c.protected);

		if (!defaultCollection) {
			return;
		}

		const formData = new URLSearchParams();
		formData.set('collection', defaultCollection.id.toString());
		formData.set('archive', gallery.id.toString());

		fetch(`/g/${gallery.id}/?/${bookmarked ? 'addCollection' : 'removeCollection'}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: formData,
		})
			.then((res) => res.json())
			.then((result) => {
				if (result.type === 'success') {
					toast(BookmarkToast, {
						componentProps: {
							gallery,
							bookmarked,
							collection: defaultCollection.slug,
							onChange: () => {
								bookmarkGallery = gallery;
								collectionsOpen = true;
							},
						},
						duration: 5000,
						id: `bookmark-${gallery.id}`,
					});
				}

				invalidateAll();
			});
	};
</script>

<div class="group h-auto w-auto space-y-2">
	<a
		href="/g/{gallery.id}{page.url.search}"
		tabindex="-1"
		{...newTab && { target: '_blank' }}
		onclick={(ev) => {
			if (enableBookmark && imageBookmark) {
				ev.preventDefault();
				handleBookmark(!_bookmarked);
			}
		}}
	>
		<div class="relative overflow-clip rounded-md shadow">
			<img
				alt="'{gallery.title}' cover"
				class="aspect-[45/64] bg-neutral-800 object-contain"
				height={910}
				loading="eager"
				src="{appState.siteConfig.imageServer}/image/{gallery.hash}/{gallery.thumbnail}?type=cover"
				width={640}
			/>

			{#if browser && enableBookmark}
				<div
					class={cn(
						'absolute end-1 top-1 hidden group-hover:block',
						_bookmarked && type === 'collection' && 'block'
					)}
				>
					<button
						class={cn(
							'flex size-9 items-center justify-center rounded-md bg-indigo-700 p-2 opacity-85 hover:opacity-95 active:opacity-100',
							_bookmarked && 'opacity-90'
						)}
						onclick={(ev) => {
							ev.preventDefault();
							ev.stopPropagation();
							handleBookmark(!_bookmarked);
						}}
					>
						<Bookmark class={cn(_bookmarked && 'fill-white')} />
					</button>
				</div>

				<Dialog.Root onOpenChange={(open) => (collectionsOpen = open)} open={collectionsOpen}>
					<Dialog.Content>
						{#if bookmarkGallery}
							<BookmarkDialog gallery={bookmarkGallery} />
						{/if}
					</Dialog.Content>
				</Dialog.Root>
			{/if}

			<div class="absolute end-1 bottom-1 flex gap-1">
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

	<div class="h-fit space-y-1.5">
		<a
			class="focus-visible:text-foreground group-hover:text-foreground line-clamp-2 pe-2 leading-6 font-medium underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
			href="/g/{gallery.id}{page.url.search}"
			title={gallery.title}
			{...newTab && { target: '_blank' }}
		>
			{gallery.title}
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
	</div>
</div>
