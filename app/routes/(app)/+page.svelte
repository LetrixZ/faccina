<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import BookmarkToast from '$lib/components/bookmark-toast.svelte';
	import ListItem from '$lib/components/list-item.svelte';
	import ListNavbar from '$lib/components/list-navbar.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import BookmarkDialog from '$lib/components/bookmark-dialog.svelte';
	import type { GalleryListItem } from '$lib/types';

	export let data;

	let collectionsOpen = false;
	let bookmarkGallery: GalleryListItem | null = null;

	$: {
		if (!collectionsOpen) {
			bookmarkGallery = null;
		}
	}

	$: library = data.library;
</script>

<svelte:head>
	<title>Home • {data.site.name}</title>
</svelte:head>

<main class="container relative flex flex-auto flex-col gap-y-2">
	<PageTitle>Browse ({library.total})</PageTitle>

	<div class="grid items-end gap-2 md:flex">
		<ListNavbar {library} type="main" />
	</div>

	<Separator />

	{#if library.archives.length}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each library.archives as archive (archive.id)}
				<ListItem
					bookmarked={!!data.userCollections
						?.find((c) => c.protected)
						?.archives.find((a) => a.id === archive.id)}
					enableBookmark
					gallery={archive}
					on:bookmark={({ detail }) => {
						const defaultCollection = data.userCollections?.find((c) => c.protected);

						if (!defaultCollection) {
							return;
						}

						const formData = new URLSearchParams();
						formData.set('collection', defaultCollection.id.toString());
						formData.set('archive', archive.id.toString());

						fetch(`/g/${archive.id}/?/${detail ? 'addCollection' : 'removeCollection'}`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: formData,
						})
							.then((res) => res.json())
							.then((result) => {
								if (result.type === 'success') {
									toast(BookmarkToast, {
										componentProps: {
											gallery: archive,
											bookmarked: detail,
											onChange: () => {
												bookmarkGallery = archive;
												collectionsOpen = true;
											},
										},
										duration: 5000,
										id: `bookmark-${archive.id}`,
									});
								}

								invalidateAll();
							});
					}}
					type="main"
				/>
			{/each}
		</div>
	{:else}
		<p class="mx-auto my-auto w-fit text-2xl font-medium">No results found</p>
	{/if}

	<Separator />

	<ListPagination
		class="mx-auto w-fit md:mx-0 md:ms-auto md:flex-grow-0"
		limit={library.limit}
		total={library.total}
	/>
</main>

<Dialog.Root onOpenChange={(open) => (collectionsOpen = open)} open={collectionsOpen}>
	<Dialog.Content>
		{#if bookmarkGallery}
			<BookmarkDialog gallery={bookmarkGallery} />
		{/if}
	</Dialog.Content>
</Dialog.Root>
