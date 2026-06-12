<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	let { class: className, children }: { class?: ClassValue; children?: Snippet } = $props();
</script>

<p class={cn('flex min-h-8 items-center text-xl font-semibold text-foreground', className)}>
	{@render children?.()}
</p>
