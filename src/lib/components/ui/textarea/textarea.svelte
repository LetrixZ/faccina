<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		'data-slot': dataSlot = 'textarea',
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea
	bind:this={ref}
	bind:value
	class={cn(
		'aria-invalid:ring-destructive/40 aria-invalid:border-destructive/50 shadow-xs focus-visible:ring-3 aria-invalid:ring-3 field-sizing-content flex min-h-16 w-full rounded-md border border-input bg-input/30 px-2.5 py-2 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
		className
	)}
	data-slot={dataSlot}
	{...restProps}
></textarea>
