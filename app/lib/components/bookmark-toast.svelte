<script lang="ts">
	import type { GalleryListItem } from '$lib/types';
	import { Button } from './ui/button';

	export let gallery: GalleryListItem;
	export let bookmarked: boolean;
	export let collection: string;
	export let onChange: () => void;
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

	<Button class="text-xs" on:click={() => onChange()} size="sm" variant="outline">Change</Button>
</div>
