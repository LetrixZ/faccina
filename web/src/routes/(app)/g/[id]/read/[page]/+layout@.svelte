<script lang="ts">
	import ReaderBar from '$lib/components/reader-bar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { prefs } from '$lib/reader-store';
	import '../../../../../../app.pcss';

	export let data;

	$prefs = data.prefs;
</script>

<slot></slot>

<Toaster richColors position="top-right" />

<ReaderBar />
