<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ListItem from '$lib/components/list-item.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Ordering, Sorting } from '$lib/models';
	import { randomInt } from '$lib/utils';
	import { Separator } from '$ui/separator';

	export let data;

	$: sort = ($page.url.searchParams.get('sort') as Sorting) ?? Sorting.RELEASED_AT;
	$: order = ($page.url.searchParams.get('order') as Ordering) ?? Ordering.DESC;
</script>

<svelte:head>
	<title>Home • Faccina</title>
</svelte:head>

<main class="container relative space-y-2">
	{#await data.libraryPage}
		<p class="text-xl font-semibold text-foreground">Browse</p>

		<div class="grid items-end gap-2 md:flex">
			<SortOptions />
		</div>

		<Separator />

		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each new Array(12) as _}
				<div class="space-y-2">
					<div class="aspect-[90/127] w-full">
						<Skeleton class="h-full w-full" />
					</div>

					<div class="h-fit space-y-1.5">
						<Skeleton class="h-6 w-[80%]" />

						<div class="flex flex-wrap gap-1.5">
							{#each new Array(randomInt(2, 6)) as _}
								<Skeleton class="h-5" style={`width: ${randomInt(40, 90)}px`} />
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:then libraryPage}
		<p class="text-xl font-semibold text-foreground">Browse ({libraryPage.total})</p>

		<div class="grid items-end gap-2 md:flex">
			<SortOptions
				{sort}
				{order}
				onSort={(sort) => {
					const query = new URLSearchParams(location.search);
					query.set('sort', sort ?? Sorting.RELEASED_AT);
					goto(`?${query.toString()}`);
				}}
				onOrder={(order) => {
					const query = new URLSearchParams(location.search);
					query.set('order', order ?? Ordering.DESC);
					goto(`?${query.toString()}`);
				}}
			/>
			<ListPagination
				page={libraryPage.page}
				limit={libraryPage.limit}
				total={libraryPage.total || 1}
				urlParams={$page.url.searchParams}
				class="mx-auto w-fit md:mx-0 md:ms-auto"
			/>
		</div>

		<Separator />

		{#if libraryPage.archives.length}
			<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
				{#each libraryPage.archives as archive (archive.id)}
					<ListItem {archive} />
				{/each}
			</div>
		{:else}
			<p class="mx-auto w-fit py-20 text-4xl font-medium">No results found</p>
		{/if}

		<Separator />

		<ListPagination
			page={libraryPage.page}
			limit={libraryPage.limit}
			total={libraryPage.total || 1}
			class="mx-auto w-fit flex-grow md:mx-0 md:ms-auto md:flex-grow-0"
		/>
	{/await}
</main>
