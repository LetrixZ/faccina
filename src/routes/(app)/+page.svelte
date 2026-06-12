<script lang="ts">
	import ListItem from '$lib/components/list-item.svelte';
	import ListNavbar from '$lib/components/list-navbar.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>Home • {data.site.name}</title>
</svelte:head>

<main class="container relative flex flex-auto flex-col gap-y-2">
	<PageTitle>Browse ({data.library.total})</PageTitle>

	<div class="grid items-end gap-2 md:flex">
		<ListNavbar
			defaultOrder={data.site.defaultOrder}
			defaultPageLimit={data.site.defaultPageLimit}
			defaultSort={data.site.defaultSort}
			library={data.library}
			pageLimits={data.site.pageLimits}
			type="main"
		/>
	</div>

	<Separator />

	{#if data.library.data.length}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each data.library.data as archive (archive.id)}
				<ListItem
					collections={data.userCollections}
					enableBookmark={!!data.user}
					gallery={archive}
					imageServer={data.site.imageServer}
					type="main"
				/>
			{/each}
		</div>
	{:else}
		<p class="mx-auto my-auto w-fit text-2xl font-medium">No results found</p>
	{/if}

	<Separator />

	<ListPagination
		class="mx-auto w-fit md:mx-0 md:ms-auto md:grow-0"
		limit={data.library.limit}
		total={data.library.total}
	/>
</main>
