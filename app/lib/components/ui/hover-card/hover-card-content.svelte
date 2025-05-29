<script lang="ts">
	import { cn, flyAndScale } from '$lib/utils.js';
	import { LinkPreview as HoverCardPrimitive } from 'bits-ui';

	type $$Props = HoverCardPrimitive.ContentProps;

	let className: $$Props['class'] = undefined;
	export let transition: $$Props['transition'] = flyAndScale;
	export let transitionConfig: $$Props['transitionConfig'] = undefined;
	export let align: $$Props['align'] = 'center';
	export let sideOffset: $$Props['sideOffset'] = 4;
	export { className as class };
</script>

<HoverCardPrimitive.Content
	class={cn(
		'z-50 mt-3 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
		className
	)}
	{align}
	{sideOffset}
	{transition}
	{transitionConfig}
	{...$$restProps}
>
	<slot />
</HoverCardPrimitive.Content>
