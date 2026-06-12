<script lang="ts">
	import ListNavbar from '$lib/components/list-navbar.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import SeriesListItem from '$lib/components/series-list-item.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	let { data } = $props();

	const library = $derived(data.libraryPage);
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
			defaultOrder={data.site.defaultOrder}
			defaultPageLimit={data.site.defaultPageLimit}
			defaultSort="updated_at"
			{library}
			pageLimits={data.site.pageLimits}
			sortOptions={['updated_at', 'created_at', 'title']}
		/>
	</div>

	<Separator />

	{#if library.data.length}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each library.data as series (series.id)}
				<SeriesListItem imageServer={data.site.imageServer} {series} />
			{/each}
		</div>
	{:else}
		<p class="mx-auto my-auto w-fit text-2xl font-medium">No results found</p>
	{/if}

	<Separator />

	<ListPagination
		class="mx-auto w-fit md:mx-0 md:ms-auto md:grow-0"
		limit={library.limit}
		total={library.total}
	/>
</main>
