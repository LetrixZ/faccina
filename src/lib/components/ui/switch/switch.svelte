<script lang="ts">
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
	import { Switch as SwitchPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		checked = $bindable(false),
		size = 'default',
		...restProps
	}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> & {
		size?: 'sm' | 'default';
	} = $props();
</script>

<SwitchPrimitive.Root
	bind:checked
	bind:ref
	class={cn(
		'data-checked:bg-primary aria-invalid:ring-destructive/40 aria-invalid:border-destructive/50 data-unchecked:bg-input/80 shadow-xs focus-visible:ring-3 aria-invalid:ring-3 group/switch data-disabled:cursor-not-allowed data-disabled:opacity-50 peer relative inline-flex shrink-0 items-center rounded-full border border-transparent outline-none transition-all after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-ring/50 data-[size=default]:h-[18.4px] data-[size=sm]:h-[14px] data-[size=default]:w-[32px] data-[size=sm]:w-[24px]',
		className
	)}
	data-size={size}
	data-slot="switch"
	{...restProps}
>
	<SwitchPrimitive.Thumb
		class="data-unchecked:bg-foreground data-checked:bg-primary-foreground group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 rtl:data-[state=checked]:translate-x-[calc(-100%)]"
		data-slot="switch-thumb"
	/>
</SwitchPrimitive.Root>
