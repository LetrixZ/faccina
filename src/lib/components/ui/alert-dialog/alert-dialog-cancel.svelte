<script lang="ts">
	import {
		buttonVariants,
		type ButtonVariant,
		type ButtonSize
	} from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'outline',
		size = 'default',
		...restProps
	}: AlertDialogPrimitive.CancelProps & {
		variant?: ButtonVariant;
		size?: ButtonSize;
	} = $props();
</script>

<AlertDialogPrimitive.Cancel
	bind:ref
	class={cn(
		buttonVariants({ variant, size }),
		"grid gap-0.5 rounded-lg border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4-dialog-cancel",
		className
	)}
	data-slot="alert-dialog-cancel"
	{...restProps}
/>
