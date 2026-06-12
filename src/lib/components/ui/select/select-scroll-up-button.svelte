<script lang="ts">
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import { Select as SelectPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SelectPrimitive.ScrollUpButtonProps> = $props();
</script>

<SelectPrimitive.ScrollUpButton
	bind:ref
	class={cn(
		"bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4 top-0 w-full",
		className
	)}
	data-slot="select-scroll-up-button"
	{...restProps}
>
	<ChevronUpIcon />
</SelectPrimitive.ScrollUpButton>
