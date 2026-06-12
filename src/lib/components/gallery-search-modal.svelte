<script lang="ts">
	import LimitOptions from '$lib/components/limit-options.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SearchBar from '$lib/components/search-bar.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import { Label } from '$lib/components/ui/label';
	import { type Order, type Sort } from '$lib/schemas.js';
	import type { GalleryLibraryResponse, GalleryListItem } from '$lib/types.js';
	import type { Tag } from '$lib/types.js';
	import GalleryListItemC from './gallery-list-item.svelte';
	import { Switch } from './ui/switch';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	let {
		selected = [],
		onSelect,
		imageServer,
		searchPlaceholder = '',
		pageLimits,
		defaultSort,
		defaultOrder,
		tags
	}: {
		selected?: GalleryListItem[];
		onSelect: (gallery: GalleryListItem) => void;
		imageServer: string;
		searchPlaceholder?: string;
		pageLimits: number[];
		defaultSort: Sort;
		defaultOrder: Order;
		tags: Tag[];
	} = $props();

	const selectedIds = $derived(selected.map((gallery) => gallery.id));

	let isMounted = $state(false);
	let filterSelected = $state(false);

	let library = $state<GalleryLibraryResponse | null>(null);

	let searchQuery = $derived<{
		query: string;
		page: number;
		limit: number;
		sort: Sort;
		order: Order;
		ids: number[];
		seed?: string;
	}>({
		query: '',
		page: 1,
		limit: pageLimits[0] ?? 24,
		sort: defaultSort,
		order: defaultOrder,
		ids: []
	});

	const search = async () => {
		const { query, page, limit, sort, order, ids, seed } = searchQuery;

		const params = new URLSearchParams({
			q: query,
			page: page.toString(),
			limit: limit.toString(),
			sort,
			order
		});

		if (seed) {
			params.set('seed', seed);
		}

		if (filterSelected) {
			params.set('ids', ids.join(','));
		}

		const res = await fetch(`/internal?${params.toString()}`, {
			headers: {
				Accept: 'application/json'
			}
		});

		if (res.ok) {
			const data = await res.json();
			library = data as GalleryLibraryResponse;
			searchQuery.seed = library.seed;
		} else {
			toast.error('Failed to load galleries');
		}
	};

	$effect(() => {
		searchQuery.ids = filterSelected ? selectedIds : [];

		if (isMounted) {
			search();
		}
	});

	onMount(() => {
		isMounted = true;
	});

	$effect(() => {
		if (!selected.length) {
			filterSelected = false;
		}
	});
</script>

<div class="flex gap-2">
	<SearchBar
		onSearch={(query) => {
			searchQuery = { ...searchQuery, page: 1, query };
			search();
		}}
		{searchPlaceholder}
		{tags}
	/>
</div>

<div class="grid items-end gap-2 lg:flex">
	<div class="flex flex-wrap items-end gap-2">
		<LimitOptions
			defaultPageLimit={pageLimits[0] ?? 24}
			onChange={(limit) => {
				searchQuery = { ...searchQuery, limit };
				search();
				return true;
			}}
			{pageLimits}
			value={searchQuery.limit}
		/>

		<div class="max-xs:flex-auto">
			<SortOptions
				{defaultOrder}
				{defaultSort}
				onOrder={(order) => {
					searchQuery = { ...searchQuery, order };
					search();
					return true;
				}}
				onSort={(detail) => {
					searchQuery = { ...searchQuery, sort: detail.sort, seed: detail.seed };
					search();
					return true;
				}}
				order={searchQuery.order}
				sort={searchQuery.sort}
			/>
		</div>

		<div class="flex items-center gap-2 py-1 max-xs:w-full">
			<Switch
				bind:checked={filterSelected}
				disabled={!selected.length}
				id="show-selected"
				onclick={() => (searchQuery.page = 1)}
			/>
			<Label class="w-full" for="show-selected">Show only selected</Label>
		</div>
	</div>

	{#if library}
		<ListPagination
			class="mx-auto w-full sm:w-fit md:mx-0 md:ms-auto"
			limit={library.limit}
			onNavigate={(page) => {
				searchQuery = { ...searchQuery, page };
				search();
			}}
			total={library.total}
			value={searchQuery.page}
		/>
	{/if}
</div>

{#if library}
	{#if library.data.length}
		<div
			class="grid flex-1 grid-cols-2 gap-2 overflow-auto pb-2 pe-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
		>
			{#each library.data as gallery (gallery.id)}
				<GalleryListItemC
					{gallery}
					{imageServer}
					{onSelect}
					selected={selectedIds.includes(gallery.id)}
				/>
			{/each}
		</div>
	{:else}
		<p class="mx-auto my-auto w-fit py-20 text-2xl font-medium">No results found</p>
	{/if}
{/if}
