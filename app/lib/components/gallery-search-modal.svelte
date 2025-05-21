<script lang="ts">
	import LimitOptions from '$lib/components/limit-options.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SearchBar from '$lib/components/search-bar.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import { Label } from '$lib/components/ui/label';
	import { type Order, type Sort } from '$lib/schemas';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import GalleryListItemC from './gallery-list-item.svelte';
	import { Switch } from './ui/switch';
	import type { GalleryLibraryResponse, GalleryItem, SiteConfig, Tag } from '$lib/types';

	type Props = {
		selected: GalleryItem[];
		onSelect?: (gallery: GalleryItem) => void;
		tagList: Tag[];
		siteConfig: SiteConfig;
	};

	let { selected, tagList, onSelect, siteConfig }: Props = $props();

	const selectedIds = $derived(selected.map((gallery) => gallery.id));

	let isMounted = $state(false);
	let filterSelected = $state(false);

	let library: GalleryLibraryResponse | null = $state(null);

	type SearchQuery = {
		query: string;
		page: number;
		limit: number;
		sort: Sort;
		order: Order;
		ids: number[];
		seed?: string;
	};

	let searchQuery = $derived<SearchQuery>({
		query: '',
		page: 1,
		limit: siteConfig.pageLimits[0] ?? 24,
		sort: siteConfig.defaultSort,
		order: siteConfig.defaultOrder,
		ids: [],
	});

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

		if (filterSelected) {
			params.set('ids', ids.join(','));
		}

		const res = await fetch(`/internal?${params.toString()}`, {
			headers: {
				Accept: 'application/json',
			},
		});

		if (res.ok) {
			const data = await res.json();
			library = data as GalleryLibraryResponse;
			searchQuery.seed = library.seed;
		} else {
			toast.error('Failed to load galleries');
		}
	};

	onMount(() => {
		isMounted = true;
	});

	$effect(() => {
		searchQuery.ids = filterSelected ? selectedIds : [];

		if (isMounted) {
			search();
		}
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
		searchPlaceholder={siteConfig.searchPlaceholder}
		tags={tagList}
	/>
</div>

<div class="grid items-end gap-2 lg:flex">
	<div class="flex flex-wrap items-end gap-2">
		<LimitOptions
			onChange={(value) => {
				searchQuery = { ...searchQuery, limit: value };
				search();
				return false;
			}}
			{siteConfig}
			value={searchQuery.limit}
		/>

		<div class="max-xs:flex-auto">
			<SortOptions
				defaultOrder={siteConfig.defaultOrder}
				defaultSort={siteConfig.defaultSort}
				onOrder={(order) => {
					searchQuery = { ...searchQuery, order };
					search();
					return false;
				}}
				onSort={(sort, seed) => {
					searchQuery = { ...searchQuery, sort, seed };
					search();
					return false;
				}}
				order={searchQuery.order}
				sort={searchQuery.sort}
			/>
		</div>

		<div class="max-xs:w-full flex items-center gap-2 py-1">
			<Switch
				id="show-selected"
				disabled={!selected.length}
				onclick={() => (searchQuery.page = 1)}
				bind:checked={filterSelected}
			/>
			<Label class="w-full" for="show-selected">Show only selected</Label>
		</div>
	</div>

	{#if library}
		<ListPagination
			class="mx-auto w-full sm:w-fit md:mx-0 md:ms-auto"
			currentPage={library.page}
			limit={library.limit}
			onNavigate={(page) => {
				searchQuery = { ...searchQuery, page };
				search();
				return false;
			}}
			total={library.total}
			value={searchQuery.page}
		/>
	{/if}
</div>

{#if library}
	{#if library.data.length}
		<div
			class="grid flex-1 grid-cols-2 gap-2 overflow-auto pe-2 pb-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
		>
			{#each library.data as gallery (gallery.id)}
				<GalleryListItemC
					{gallery}
					{onSelect}
					selected={selectedIds.includes(gallery.id)}
					{siteConfig}
				/>
			{/each}
		</div>
	{:else}
		<p class="mx-auto my-auto w-fit py-20 text-2xl font-medium">No results found</p>
	{/if}
{/if}
