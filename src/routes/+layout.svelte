<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import './layout.css';

	let { data, children } = $props();
</script>

<Toaster position="bottom-center" richColors />

<svelte:head>
	<title>{data.site.name}</title>
</svelte:head>

<Tooltip.Provider>
	{@render children()}
</Tooltip.Provider>
