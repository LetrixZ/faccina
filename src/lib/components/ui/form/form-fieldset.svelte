<script generics="T extends Record<string, unknown>, U extends FormPath<T>" lang="ts">
	import { cn, type WithoutChild } from '$lib/utils.js';
	import * as FormPrimitive from 'formsnap';
	import type { FormPath } from 'sveltekit-superforms';

	let {
		ref = $bindable(null),
		class: className,
		form,
		name,
		...restProps
	}: WithoutChild<FormPrimitive.FieldsetProps<T, U>> = $props();
</script>

<FormPrimitive.Fieldset bind:ref class={cn('space-y-2', className)} {form} {name} {...restProps} />
