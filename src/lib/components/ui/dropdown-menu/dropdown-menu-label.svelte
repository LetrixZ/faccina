<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		inset?: boolean;
	} = $props();
</script>

<div
	bind:this={ref}
	class={cn('cn-dropdown-menu-label data-inset:pl-8', className)}
	data-inset={inset}
	data-slot="dropdown-menu-label"
	{...restProps}
>
	{@render children?.()}
</div>
