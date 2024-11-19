<script lang="ts">
	import { Button } from './ui/button';
	import type { GalleryListItem } from '$lib/types';

	export let gallery: GalleryListItem;
	export let bookmarked: boolean;
	export let onChange: () => void;
</script>

<div class="flex items-center justify-between gap-1">
	<div>
		{#if bookmarked}
			Saved <a class="font-bold" href="/g/{gallery.id}">{gallery.title}</a> to
			<a class="font-bold" href="/collections/bookmarks-lswrkaufxhfqcd4o">Bookmarks</a>
		{:else}
			Removed <a class="font-bold" href="/g/{gallery.id}">{gallery.title}</a> from
			<a class="font-bold" href="/collections/bookmarks-lswrkaufxhfqcd4o">Bookmarks</a>
		{/if}
	</div>

	<Button class="text-xs" on:click={() => onChange()} size="sm" variant="outline">Change</Button>
</div>
