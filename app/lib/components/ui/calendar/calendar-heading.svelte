<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Calendar as CalendarPrimitive } from 'bits-ui';

	type $$Props = CalendarPrimitive.HeadingProps;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<CalendarPrimitive.Heading
	class={cn('text-sm font-medium', className)}
	let:headingValue
	{...$$restProps}
>
	<slot {headingValue}>
		{headingValue}
	</slot>
</CalendarPrimitive.Heading>
