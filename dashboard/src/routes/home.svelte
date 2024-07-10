<script lang="ts">
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import type { ArchiveData, LibraryPage, Ordering, Sorting } from '$lib/models';
	import { Separator } from '$ui/separator';
	import { createQuery } from '@tanstack/svelte-query';
	import { derived } from 'svelte/store';
	import ListItem from '../lib/components/list-item.svelte';
	import { searchParams } from '../lib/stores';

	const query = createQuery<LibraryPage<ArchiveData>>(
		derived(searchParams, () => ({
			placeholderData: (previousData) => previousData,
			queryKey: ['library', searchParams.toString()],
			queryFn: async () =>
				await fetch(`/api/library?${new URLSearchParams(searchParams.toString()).toString()}`).then(
					(r) => r.json()
				),
		}))
	);

	$: total = $query.data?.total;
	$: archives = $query.data?.archives;

	const onSort = (sort: Sorting) => searchParams.setParams({ sort });
	const onOrder = (order: Ordering) => searchParams.setParams({ order });
</script>

<svelte:window on:popstate={() => searchParams.setFromURL()} />

<main class="container relative space-y-2">
	<p class="text-xl font-semibold text-foreground">
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
