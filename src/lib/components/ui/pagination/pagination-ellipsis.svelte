<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import type { HTMLAttributes } from 'svelte/elements';
	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLSpanElement>>> = $props();
</script>

<span
	aria-hidden="true"
	bind:this={ref}
	class={cn(
		"size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4 flex",
		className
	)}
	data-slot="pagination-ellipsis"
	{...restProps}
>
	<MoreHorizontalIcon />
	<span class="sr-only">More pages</span>
</span>
