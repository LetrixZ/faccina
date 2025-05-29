<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Calendar as CalendarPrimitive } from 'bits-ui';

	type $$Props = CalendarPrimitive.NextButtonProps;
	type $$Events = CalendarPrimitive.NextButtonEvents;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<CalendarPrimitive.NextButton
	class={cn(
		buttonVariants({ variant: 'outline' }),
		'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
		className
	)}
	on:click
	{...$$restProps}
	let:builder
>
	<slot {builder}>
		<ChevronRight class="h-4 w-4" />
	</slot>
</CalendarPrimitive.NextButton>
