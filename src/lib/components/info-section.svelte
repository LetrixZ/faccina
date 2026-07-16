<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	let {
		class: className,
		name,
		children
	}: {
		name?: string;
		class?: ClassValue;
		children: Snippet;
	} = $props();
</script>

<div
	class={cn(
		'p-3 bg-neutral-800 odd:bg-neutral-900',
		className
	)}
>
	{#if name}
		<p class="pb-1 text-xs font-medium uppercase tracking-wide">{name}</p>
	{/if}

	{@render children()}
</div>
