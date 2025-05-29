<script context="module" lang="ts">
	import type { FormPath, SuperForm } from 'sveltekit-superforms';
	type T = Record<string, unknown>;
	type U = FormPath<T>;
</script>

<script generics="T extends Record<string, unknown>, U extends FormPath<T>" lang="ts">
	import { cn } from '$lib/utils.js';
	import * as FormPrimitive from 'formsnap';
	import type { HTMLAttributes } from 'svelte/elements';

	type $$Props = FormPrimitive.FieldProps<T, U> & HTMLAttributes<HTMLElement>;

	export let form: SuperForm<T>;
	export let name: U;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<FormPrimitive.Field {name} {form} let:constraints let:errors let:tainted let:value>
	<div class={cn('space-y-2', className)}>
		<slot {constraints} {errors} {tainted} {value} />
	</div>
</FormPrimitive.Field>
