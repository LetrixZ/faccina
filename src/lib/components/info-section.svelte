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
		'bg-neutral-200 p-3 odd:bg-neutral-100 dark:bg-neutral-800 odd:dark:bg-neutral-900',
		className
	)}
>
	{#if name}
		<p class="pb-1 text-xs font-medium uppercase tracking-wide">{name}</p>
	{/if}

	{@render children()}
</div>
