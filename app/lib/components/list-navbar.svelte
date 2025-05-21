<script lang="ts">
	import LimitOptions from '$lib/components/limit-options.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import type { Query } from '$lib/query.svelte';
	import type { Sort } from '$lib/schemas';
	import type { LibraryResponse, ListPageType } from '$lib/types';

	type Props = {
		library: LibraryResponse<unknown>;
		type: ListPageType;
		sortOptions?: Sort[];
		pageLimits: number[];
		query: Query;
		onQuery?: (query: Query) => boolean | unknown;
	};

	let { library, type, sortOptions, pageLimits, query, onQuery }: Props = $props();
</script>

<div class="flex w-full gap-1.5">
	<LimitOptions
		onChange={(value) => (query.limit = value) && onQuery?.(query)}
		{pageLimits}
		value={query.limit}
	/>
	<SortOptions
		onOrder={(value) => (query.order = value) && onQuery?.(query)}
		onSort={(value) => (query.sort = value) && onQuery?.(query)}
		order={query.order}
		sort={query.sort}
		{sortOptions}
		{type}
	/>
</div>

<ListPagination currentPage={library.page} limit={library.limit} total={library.total} />
