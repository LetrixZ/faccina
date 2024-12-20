<script lang="ts">
	const { data } = $props();
	const { Content, metadata } = $derived(data);
</script>

<svelte:head>
	<title>{metadata.title} | Faccina</title>
</svelte:head>

<div class="all-prose min-w-full">
	<Content />
</div>
