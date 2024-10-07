<script lang="ts">
	import { page } from '$app/stores';
	import Reader from '$lib/components/reader.svelte';
	import { MetaTags } from 'svelte-meta-tags';

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

<MetaTags
	canonical={data.site.url}
	description={data.archive.description ?? undefined}
	openGraph={{
		url: `${data.site.url}/g/${data.archive.id}`,
		description: data.archive.description ?? undefined,
		type: 'article',
		images: [{ url: `${data.site.url}/api/og/g/${data.archive.id}` }],
		siteName: data.site.name,
	}}
	title={`Page ${currentPage} - ${data.archive.title}`}
	titleTemplate={`%s - ${data.site.name}`}
	twitter={{
		cardType: 'summary_large_image',
		description: data.archive.description ?? undefined,
		image: `${data.site.url}/api/og/g/${data.archive.id}`,
		title: `Page ${currentPage} - ${data.archive.title} - ${data.site.name}`,
	}}
/>

{#await data.archive then archive}
	<Reader {archive} />
{/await}
