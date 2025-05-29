<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import BookmarkDialog from '$lib/components/bookmark-dialog.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { siteConfig, userCollections } from '$lib/stores';
	import { cn } from '$lib/utils';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import pixelWidth from 'string-pixel-width';
	import { toast } from 'svelte-sonner';
	import type { GalleryListItem, ListPageType, Tag } from '../types';
	import BookmarkToast from './bookmark-toast.svelte';
	import Chip from './chip.svelte';
	import { Button } from './ui/button';

	export let gallery: GalleryListItem;
	export let enableBookmark = false;
	export let imageBookmark = false;
	export let newTab = false;
	export let type: ListPageType;

	export let bookmarked: boolean | undefined = undefined;
	export let onBookmark: ((bookmarked: boolean) => void) | undefined = undefined;

	let collectionsOpen = false;
	let bookmarkGallery: GalleryListItem | null = null;

	$: _bookmarked =
		bookmarked !== undefined
			? bookmarked
			: !!$userCollections
					?.find((c) => c.protected)
					?.archives.find((archive) => archive.id === gallery.id);

	$: {
		if (!collectionsOpen) {
			bookmarkGallery = null;
		}
	}

	$: [reducedTags, moreCount] = (() => {
		const tags = gallery.tags;

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

	const handleBookmark = (bookmarked: boolean) => {
		if (onBookmark) {
			onBookmark(bookmarked);
			return;
		}

		const defaultCollection = $userCollections?.find((c) => c.protected);

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
		href={`/g/${gallery.id}${$page.url.search}`}
		tabindex="-1"
		{...newTab && { target: '_blank' }}
		on:click={(ev) => {
			if (enableBookmark && imageBookmark) {
				ev.preventDefault();
				handleBookmark(!_bookmarked);
			}
		}}
	>
		<div class="relative overflow-clip rounded-md shadow">
			<img
				class="aspect-[45/64] bg-neutral-800 object-contain"
				alt={`'${gallery.title}' cover`}
				height={910}
				loading="eager"
				src={`${$siteConfig.imageServer}/image/${gallery.hash}/${gallery.thumbnail}?type=cover`}
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
						on:click|preventDefault|stopPropagation={() => {
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

	<div class="h-fit space-y-1.5">
		<a
			class="line-clamp-2 pe-2 font-medium leading-6 underline-offset-4 hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none group-hover:text-foreground"
			href={`/g/${gallery.id}${$page.url.search}`}
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
					class="h-6 w-fit px-1.5 py-0 text-xs font-semibold text-neutral-50 dark:text-neutral-200"
					variant="secondary"
				>
					+ {moreCount}
				</Button>
			{/if}
		</div>
	</div>
</div>
