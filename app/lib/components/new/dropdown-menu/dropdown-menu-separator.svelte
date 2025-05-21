<script lang="ts">
	import { cn } from '$lib/utils';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DropdownMenuPrimitive.SeparatorProps = $props();
</script>

<DropdownMenuPrimitive.Separator bind:ref {...restProps}>
	{#snippet child({ props })}
		<div class={cn('-mx-1 my-1 h-px', className)} {...props}></div>
	{/snippet}
</DropdownMenuPrimitive.Separator>

<style>
	div {
		background-color: --alpha(
			color-mix(in oklab, var(--color-neutral-500) 80%, var(--color-accent)) / 80%
		);
	}
</style>
