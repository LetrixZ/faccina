<script lang="ts">
	import { reader } from './reader.svelte.js';

	let { data, children } = $props();

	$effect(() => {
		reader.init(data.defaultPreset);
	});
</script>

{#if reader.current}
	{@render children?.()}
{/if}
