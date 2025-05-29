<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Calendar as CalendarPrimitive } from 'bits-ui';

	type $$Props = CalendarPrimitive.GridHeadProps;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<CalendarPrimitive.GridHead class={cn(className)} {...$$restProps}>
	<slot />
</CalendarPrimitive.GridHead>
