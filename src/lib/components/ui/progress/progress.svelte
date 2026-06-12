<script lang="ts">
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
	import { Progress as ProgressPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		max = 100,
		value,
		...restProps
	}: WithoutChildrenOrChild<ProgressPrimitive.RootProps> = $props();
</script>

<ProgressPrimitive.Root
	bind:ref
	class={cn(
		'bg-muted h-1.5 rounded-full relative flex w-full items-center overflow-x-hidden',
		className
	)}
	data-slot="progress"
	{max}
	{value}
	{...restProps}
>
	<div
		class="bg-primary size-full flex-1 transition-all"
		data-slot="progress-indicator"
		style="transform: translateX(-{100 - (100 * (value ?? 0)) / (max ?? 1)}%)"
	></div>
</ProgressPrimitive.Root>
