<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
</script>

<span
	bind:this={ref}
	class={cn(
		'text-muted-foreground group-data-selected/command-item:text-foreground ml-auto text-xs tracking-widest',
		className
	)}
	data-slot="command-shortcut"
	{...restProps}
>
	{@render children?.()}
</span>
