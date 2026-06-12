<script lang="ts">
	import LimitOptions from '$lib/components/limit-options.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import type { Order, Sort } from '$lib/schemas.js';
	import type { LibraryResponse, ListPageType } from '$lib/types.js';

	let {
		library,
		type = 'main',
		pageLimits,
		defaultPageLimit,
		sortOptions,
		defaultSort,
		defaultOrder
	}: {
		library: LibraryResponse<unknown>;
		type?: ListPageType;
		pageLimits: number[];
		defaultPageLimit: number;
		sortOptions?: Sort[];
		defaultSort: Sort;
		defaultOrder: Order;
	} = $props();
</script>

<div class="flex w-full gap-2">
	<LimitOptions {defaultPageLimit} {pageLimits} />
	<SortOptions class="w-full" {defaultOrder} {defaultSort} {sortOptions} {type} />
</div>

<ListPagination
	class="mx-auto w-full sm:w-fit md:mx-0 md:ms-auto"
	limit={library.limit}
	total={library.total}
/>
