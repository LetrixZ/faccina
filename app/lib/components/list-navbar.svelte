<script lang="ts">
	import LimitOptions from '$lib/components/limit-options.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import { siteConfig } from '$lib/stores';
	import type { Sort } from '$lib/schemas';
	import type { LibraryResponse, ListPageType } from '$lib/types';

	export let library: LibraryResponse<unknown>;
	export let type: ListPageType = 'main';
	export let sortOptions: Sort[] | undefined = undefined;
	export let defaultSort: Sort | undefined = undefined;
</script>

<div class="flex w-full gap-2">
	<LimitOptions pageLimits={$siteConfig.pageLimits} />
	<SortOptions
		class="w-full"
		defaultOrder={$siteConfig.defaultOrder}
		defaultSort={defaultSort ?? $siteConfig.defaultSort}
		{sortOptions}
		{type}
	/>
</div>

<ListPagination
	class="mx-auto w-full sm:w-fit md:mx-0 md:ms-auto"
	limit={library.limit}
	total={library.total}
/>
