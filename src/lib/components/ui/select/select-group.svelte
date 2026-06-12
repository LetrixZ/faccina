<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Select as SelectPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SelectPrimitive.GroupProps = $props();
</script>

<SelectPrimitive.Group
	bind:ref
	class={cn('scroll-my-1 p-1', className)}
	data-slot="select-group"
	{...restProps}
/>
