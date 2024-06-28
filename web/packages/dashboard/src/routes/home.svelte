<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { ListPagination, Search, Separator, SortOptions } from 'shared';
	import type { ArchiveData, LibraryPage, Ordering, Sorting } from 'shared/models';
	import { derived } from 'svelte/store';
	import ListItem from '../components/list-item.svelte';
	import { searchParams } from '../lib/stores';

	const query = createQuery<LibraryPage<ArchiveData>>(
		derived(searchParams, () => ({
			placeholderData: (previousData) => previousData,
			queryKey: ['library', searchParams.toString()],
			queryFn: async () => await fetch(`/library${searchParams.toString()}`).then((r) => r.json())
		}))
	);

	$: total = $query.data?.total;
	$: archives = $query.data?.archives;

	const onSearch = (event: any) => searchParams.setParams({ query: event.detail.query, page: 1 });
	const onSort = (sort: Sorting) => searchParams.setParams({ sort });
	const onOrder = (order: Ordering) => searchParams.setParams({ order });
</script>

<svelte:window on:popstate={() => searchParams.setFromURL()} />

<main class="container relative space-y-2">
	<p class="text-foreground text-xl font-semibold">
		Browse {#if total}
			({total})
		{/if}
	</p>

	{#if $query.isSuccess}
		<div class="grid items-end gap-2 md:flex">
			<SortOptions sort={$searchParams.sort} order={$searchParams.order} {onSort} {onOrder} />
			<ListPagination
				page={$searchParams.page}
				limit={$searchParams.limit}
				total={$query.data.total || 1}
				class="mx-auto w-fit md:mx-0 md:ms-auto"
				onPageChange={(page) => ($searchParams.page = page)}
			/>
		</div>

		<Separator />

		{#if archives?.length}
			<div class="grid gap-2 md:grid-cols-2">
				{#each archives as archive (archive.id)}
					<ListItem {archive} />
				{/each}
			</div>
		{/if}
	{/if}
</main>
