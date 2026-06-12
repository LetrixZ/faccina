<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { buttonVariants } from '../button/index.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Pagination as PaginationPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: PaginationPrimitive.NextButtonProps = $props();
</script>

{#snippet Fallback()}
	<span>Next</span>
	<ChevronRightIcon class={cn('size-4', className)} />
{/snippet}

<PaginationPrimitive.NextButton
	aria-label="Go to next page"
	bind:ref
	class={cn(buttonVariants({ variant: 'ghost' }), 'pr-2!', className)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		{@render Fallback()}
	{/if}
</PaginationPrimitive.NextButton>
