<script lang="ts">
	import type { GalleryListItem } from '$lib/types';
	import { Button } from './ui/button';

	type Props = {
		gallery: GalleryListItem;
		bookmarked: boolean;
		collection: string;
		onChange?: () => void;
	};

	let { gallery, bookmarked, collection, onChange }: Props = $props();
</script>

<div class="flex items-center justify-between gap-1">
	<div>
		{#if bookmarked}
			Saved <a class="font-bold" href="/g/{gallery.id}">{gallery.title}</a> to
			<a class="font-bold" href="/collections/{collection}">Bookmarks</a>
		{:else}
			Removed <a class="font-bold" href="/g/{gallery.id}">{gallery.title}</a> from
			<a class="font-bold" href="/collections/{collection}">Bookmarks</a>
		{/if}
	</div>

	<Button class="text-xs" onclick={() => onChange?.()} size="sm" variant="outline">Change</Button>
</div>
