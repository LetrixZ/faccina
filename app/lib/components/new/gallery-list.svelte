<script lang="ts">
	import { splitEvery } from 'ramda';
	import GalleryListItem from './gallery-list-item.svelte';
	import type { GalleryItem } from '$lib/types';

	let listContainer: HTMLElement;
	let listWidth = $state(0);

	let listItems = $state<(GalleryListItem | null)[]>([]);

	type Props = {
		galleries: GalleryItem[];
	};

	let { galleries }: Props = $props();

	$effect(() => {
		if (listWidth) {
			const columnCount = window
				.getComputedStyle(listContainer)
				.getPropertyValue('grid-template-columns')
				.split(' ').length;

			const rows = splitEvery(
				columnCount,
				listItems.filter((item) => item !== null)
			);

			for (const row of rows) {
				let tallest = 0;

				for (const col of row) {
					col.maxLines = 2;
					if (col.titleHeight > tallest) {
						tallest = col.titleHeight;
					}
				}

				for (const col of row) {
					if (col.titleHeight < tallest) {
						col.maxLines = 3;
					}
				}
			}
		}
	});
</script>

<div
	bind:this={listContainer}
	class="grid grid-cols-2 gap-x-1.5 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
	bind:clientWidth={listWidth}
>
	{#each galleries as gallery, i (gallery.id)}
		<GalleryListItem bind:this={listItems[i]} {gallery} />
	{/each}
</div>
