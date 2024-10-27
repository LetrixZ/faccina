<script lang="ts">
	import ListItem from '$lib/components/list-item.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	export let data;

	$: library = data.library;
</script>

<svelte:head>
	<title>Home • {data.site.name}</title>
</svelte:head>

<main class="container relative space-y-2">
	<p class="text-xl font-semibold text-foreground">Browse ({library.total})</p>

	<div class="grid items-end gap-2 md:flex">
		<SortOptions defaultOrder={data.site.defaultOrder} defaultSort={data.site.defaultSort} />
		<ListPagination
			class="mx-auto w-full sm:w-fit md:mx-0 md:ms-auto"
			limit={library.limit}
			total={library.total}
		/>
	</div>

	<Separator />

	{#if library.archives.length}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each library.archives as archive (archive.id)}
				<ListItem gallery={archive} />
			{/each}
		</div>
	{:else}
		<p class="mx-auto w-fit py-20 text-4xl font-medium">No results found</p>
	{/if}

	<Separator />

	<ListPagination
		class="mx-auto w-full flex-grow sm:w-fit md:mx-0 md:ms-auto md:flex-grow-0"
		limit={library.limit}
		total={library.total}
	/>
</main>
