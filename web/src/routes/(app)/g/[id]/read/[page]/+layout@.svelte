<script lang="ts">
	import ReaderBar from '$lib/components/reader-bar.svelte';
	import { prefs } from '$lib/reader-store';
	import { Toaster } from '$ui/sonner';
	import '~/style.pcss';

	export let data;

	$prefs = data.prefs;
</script>

<slot></slot>

<Toaster richColors position="top-right" />

<ReaderBar />
