<script lang="ts">
	import { page } from '$app/stores';
	import Reader from '$lib/components/reader.svelte';

	export let data;

	$: currentPage = $page.state.page || parseInt($page.params.page!);
</script>

<svelte:head>
	{#await data.archive}
		<title>Page {currentPage} • Faccina</title>
	{:then archive}
		<title>Page {currentPage} • {archive.title} • Faccina</title>
	{/await}
</svelte:head>

{#await data.archive then archive}
	<Reader {archive} />
{/await}
