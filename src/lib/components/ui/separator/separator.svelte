<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Separator as SeparatorPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		'data-slot': dataSlot = 'separator',
		...restProps
	}: SeparatorPrimitive.RootProps = $props();
</script>

<SeparatorPrimitive.Root
	bind:ref
	class={cn(
		'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px',
		// this is different in shadcn/ui but self-stretch breaks things for us
		'data-[orientation=vertical]:h-full',
		className
	)}
	data-slot={dataSlot}
	{...restProps}
/>
