<script lang="ts">
	import ListNavbar from '$lib/components/list-navbar.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import SeriesListItem from '$lib/components/series-list-item.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	export let data;

	$: library = data.libraryPage;
</script>

<main class="container relative flex flex-auto flex-col gap-y-2">
	<PageTitle>
		Series ({library.total})

		{#if data.user?.admin}
			<Button class="ms-auto h-fit w-fit p-2" href="/series/new" variant="link">
				Create a new series
			</Button>
		{/if}
	</PageTitle>

	<div class="grid items-end gap-2 md:flex">
		<ListNavbar
			defaultSort="updated_at"
			{library}
			sortOptions={['updated_at', 'created_at', 'title']}
		/>
	</div>

	<Separator />

	{#if library.data.length}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each library.data as series (series.id)}
				<SeriesListItem {series} />
			{/each}
		</div>
	{:else}
		<p class="mx-auto my-auto w-fit text-2xl font-medium">No results found</p>
	{/if}

	<Separator />

	<ListPagination
		class="mx-auto w-fit md:mx-0 md:ms-auto md:flex-grow-0"
		limit={library.limit}
		total={library.total}
	/>
</main>
