<script lang="ts">
	import { cn, flyAndScale } from '$lib/utils.js';
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import * as AlertDialog from './index.js';

	type $$Props = AlertDialogPrimitive.ContentProps;

	export let transition: $$Props['transition'] = flyAndScale;
	export let transitionConfig: $$Props['transitionConfig'] = undefined;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<AlertDialog.Portal>
	<AlertDialog.Overlay />
	<AlertDialogPrimitive.Content
		class={cn(
			'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg md:w-full',
			className
		)}
		{transition}
		{transitionConfig}
		{...$$restProps}
	>
		<slot />
	</AlertDialogPrimitive.Content>
</AlertDialog.Portal>
