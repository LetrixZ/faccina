<script lang="ts">
	import { Button } from '$lib/components/ui/button/index';
	import { cn } from '$lib/utils';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Pagination as PaginationPrimitive } from 'bits-ui';

	type $$Props = PaginationPrimitive.NextButtonProps;
	type $$Events = PaginationPrimitive.NextButtonEvents;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<PaginationPrimitive.NextButton asChild let:builder>
	<Button
		class={cn('gap-1 pr-2.5', className)}
		builders={[builder]}
		variant="ghost"
		on:click
		{...$$restProps}
	>
		<slot>
			<span>Next</span>
			<ChevronRight class="h-4 w-4" />
		</slot>
	</Button>
</PaginationPrimitive.NextButton>
