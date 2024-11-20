<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { siteConfig, tagList } from '../stores';
	import { Switch } from './ui/switch';
	import LimitOptions from '$lib/components/limit-options.svelte';
	import ListItem from '$lib/components/list-item.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SearchBar from '$lib/components/search-bar.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import { Label } from '$lib/components/ui/label';
	import { type Order, type Sort } from '$lib/schemas';
	import type { GalleryListItem, LibraryResponse } from '$lib/types';

	export let selectedGalleries: number[] = [];

	const dispatch = createEventDispatcher<{
		bookmark: { gallery: GalleryListItem; bookmark: boolean };
	}>();

	let isMounted = false;
	let showSelected = false;

	let library: LibraryResponse | null = null;

	let searchQuery: {
		query: string;
		page: number;
		limit: number;
		sort: Sort;
		order: Order;
		ids: number[];
		seed?: string;
	} = {
		query: '',
		page: 1,
		limit: $siteConfig.pageLimits[0],
		sort: $siteConfig.defaultSort,
		order: $siteConfig.defaultOrder,
		ids: [],
	};

	const search = async () => {
		const { query, page, limit, sort, order, ids, seed } = searchQuery;

		const params = new URLSearchParams({
			q: query,
			page: page.toString(),
			limit: limit.toString(),
			sort,
			order,
		});

		if (seed) {
			params.set('seed', seed);
		}

		if (showSelected) {
			params.set('ids', ids.join(','));
		}

		const res = await fetch(`/internal?${params.toString()}`, {
			headers: {
				Accept: 'application/json',
			},
		});

		if (res.ok) {
			const data = await res.json();
			library = data as LibraryResponse;
			searchQuery.seed = library.seed;
		} else {
			toast.error('Failed to load galleries');
		}
	};

	$: {
		searchQuery.ids = showSelected ? selectedGalleries : [];

		if (isMounted) {
			search();
		}
	}

	onMount(() => {
		isMounted = true;
	});
</script>

<div class="flex gap-2">
	<SearchBar
		on:search={(ev) => {
			ev.preventDefault();
			searchQuery = { ...searchQuery, page: 1, query: ev.detail };
			search();
		}}
		searchPlaceholder={$siteConfig.searchPlaceholder}
		tags={$tagList}
	/>
</div>

<div class="grid items-end gap-2 lg:flex">
	<div class="flex flex-wrap items-end gap-2">
		<LimitOptions
			on:change={(ev) => {
				ev.preventDefault();
				searchQuery = { ...searchQuery, limit: ev.detail };
				search();
			}}
			pageLimits={$siteConfig.pageLimits}
			value={searchQuery.limit}
		/>

		<div class="max-xs:flex-auto">
			<SortOptions
				defaultOrder={$siteConfig.defaultOrder}
				defaultSort={$siteConfig.defaultSort}
				on:order={(ev) => {
					ev.preventDefault();
					searchQuery = { ...searchQuery, order: ev.detail };
					search();
				}}
				on:sort={(ev) => {
					ev.preventDefault();
					searchQuery = { ...searchQuery, sort: ev.detail.sort, seed: ev.detail.seed };
					search();
				}}
				order={searchQuery.order}
				sort={searchQuery.sort}
			/>
		</div>

		<div class="flex items-center gap-2 py-1 max-xs:w-full">
			<Switch
				bind:checked={showSelected}
				id="show-selected"
				on:click={() => (searchQuery.page = 1)}
			/>
			<Label class="w-full" for="show-selected">Show only selected</Label>
		</div>
	</div>

	{#if library}
		<ListPagination
			class="mx-auto w-full sm:w-fit md:mx-0 md:ms-auto"
			limit={library.limit}
			on:navigate={(ev) => {
				ev.preventDefault();
				searchQuery = { ...searchQuery, page: ev.detail };
				search();
			}}
			total={library.total}
			value={searchQuery.page}
		/>
	{/if}
</div>

{#if library}
	{#if library.archives.length}
		<div
			class="grid flex-1 grid-cols-2 gap-2 overflow-auto pb-2 pe-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
		>
			{#each library.archives as gallery (gallery.id)}
				<ListItem
					bookmarked={selectedGalleries.includes(gallery.id)}
					enableBookmark
					{gallery}
					imageBookmark
					newTab
					on:bookmark={(ev) => dispatch('bookmark', { gallery, bookmark: ev.detail })}
					type="collection"
				/>
			{/each}
		</div>
	{:else}
		<p class="mx-auto my-auto w-fit py-20 text-2xl font-medium">No results found</p>
	{/if}
{/if}
