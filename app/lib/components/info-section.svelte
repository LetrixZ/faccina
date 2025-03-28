<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		name?: string;
		class?: ClassValue | null;
		children?: Snippet;
	};

	let { name, class: className, children }: Props = $props();
</script>

<div
	class={cn(
		'bg-neutral-200 p-3 odd:bg-neutral-100 dark:bg-neutral-800 odd:dark:bg-neutral-900',
		className
	)}
>
	{#if name}
		<p class="pb-1 text-xs font-medium tracking-wide uppercase">{name}</p>
	{/if}

	{@render children?.()}
</div>
