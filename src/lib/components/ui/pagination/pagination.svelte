<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Pagination as PaginationPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		count = 0,
		perPage = 10,
		page = $bindable(1),
		siblingCount = 1,
		...restProps
	}: PaginationPrimitive.RootProps = $props();
</script>

<PaginationPrimitive.Root
	aria-label="pagination"
	bind:page
	bind:ref
	class={cn('cn-pagination mx-auto flex w-full justify-center', className)}
	{count}
	data-slot="pagination"
	{perPage}
	role="navigation"
	{siblingCount}
	{...restProps}
/>
