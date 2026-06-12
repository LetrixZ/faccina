<script lang="ts">
	import ListItem from '$lib/components/list-item.svelte';
	import ListNavbar from '$lib/components/list-navbar.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	export let data;

	$: library = data.library;
</script>

<svelte:head>
	<title>Home • {data.site.name}</title>
</svelte:head>

<main class="container relative flex flex-auto flex-col gap-y-2">
	<PageTitle>Browse ({library.total})</PageTitle>

	<div class="grid items-end gap-2 md:flex">
		<ListNavbar {library} type="main" />
	</div>

	<Separator />

	{#if library.data.length}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each library.data as archive (archive.id)}
				<ListItem enableBookmark={!!data.user} gallery={archive} type="main" />
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
