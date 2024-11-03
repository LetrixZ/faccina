<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { page } from '$app/stores';
	import Reader from '$lib/components/reader.svelte';

	export let data;

	$: gallery = data.gallery;

	$: currentPage = $page.state.page || parseInt($page.params.page!);
</script>

<svelte:head>
	<title>Page {currentPage} • {gallery.title} • {data.site.name}</title>
</svelte:head>

<MetaTags
	canonical={data.site.url}
	description={gallery.description ?? undefined}
	openGraph={{
		url: `${data.site.url}/g/${gallery.id}`,
		description: gallery.description ?? undefined,
		type: 'article',
		images: [{ url: `${data.site.url}/api/og/g/${gallery.id}` }],
		siteName: data.site.name,
	}}
	title={`Page ${currentPage} - ${gallery.title}`}
	titleTemplate={`%s - ${data.site.name}`}
	twitter={{
		cardType: 'summary_large_image',
		description: gallery.description ?? undefined,
		image: `${data.site.url}/api/og/g/${gallery.id}`,
		title: `Page ${currentPage} - ${gallery.title} - ${data.site.name}`,
	}}
/>

<Reader {gallery} />
