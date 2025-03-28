<script lang="ts">
	import LimitOptions from '$lib/components/limit-options.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import type { Sort } from '$lib/schemas';
	import { appState } from '$lib/stores';
	import type { LibraryResponse, ListPageType } from '$lib/types';

	type Props = {
		library: LibraryResponse<unknown>;
		type?: ListPageType;
		sortOptions?: Sort[];
		defaultSort?: Sort;
	};

	let {
		library,
		type = 'main',
		sortOptions = undefined,
		defaultSort = undefined,
	}: Props = $props();
</script>

<div class="flex w-full gap-2">
	<LimitOptions pageLimits={appState.siteConfig.pageLimits} />
	<SortOptions
		class="w-full"
		defaultOrder={appState.siteConfig.defaultOrder}
		defaultSort={defaultSort ?? appState.siteConfig.defaultSort}
		{sortOptions}
		{type}
	/>
</div>

<ListPagination
	class="mx-auto w-full sm:w-fit md:mx-0 md:ms-auto"
	limit={library.limit}
	total={library.total}
/>
