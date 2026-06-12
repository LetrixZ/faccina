<script lang="ts">
	import { cn, type WithoutChild } from '$lib/utils.js';
	import * as FormPrimitive from 'formsnap';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChild<FormPrimitive.DescriptionProps> = $props();
</script>

<FormPrimitive.Description
	bind:ref
	class={cn('text-muted-foreground text-sm', className)}
	data-slot="form-description"
	{...restProps}
/>
