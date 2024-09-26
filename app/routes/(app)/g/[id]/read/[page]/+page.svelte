<script lang="ts">
	import { page } from '$app/stores';
	import Reader from '$lib/components/reader.svelte';

	export let data;

	$: currentPage = $page.state.page || parseInt($page.params.page!);
</script>

<svelte:head>
	{#await data.archive}
		<title>Page {currentPage} • {data.site.name}</title>
	{:then archive}
		<title>Page {currentPage} • {archive.title} • {data.site.name}</title>
	{/await}
</svelte:head>

{#await data.archive then archive}
	<Reader {archive} />
{/await}
