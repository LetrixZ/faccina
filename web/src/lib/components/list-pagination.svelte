<script lang="ts">
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import * as Pagination from '$lib/components/ui/pagination';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	$: currentPage = (() => {
		const currentPage = $page.url.searchParams.get('page');

		if (currentPage) {
			return parseInt(currentPage);
		} else {
			return 1;
		}
	})();

	let className: string | null | undefined = undefined;

	export let total = 0;
	export { className as class };
</script>

<Pagination.Root
	count={total}
	perPage={24}
	siblingCount={1}
	page={currentPage}
	let:pages
	let:currentPage
	onPageChange={(newPage) => {
		const query = new URLSearchParams($page.url.searchParams.toString());
		query.set('page', newPage.toString());
		goto(`?${query.toString()}`);
	}}
	class={className}
>
	<Pagination.Content>
		<Pagination.Item>
			<Pagination.PrevButton>
				<ChevronLeft class="h-4 w-4" />
				<span class="hidden sm:block">Previous</span>
			</Pagination.PrevButton>
		</Pagination.Item>
		{#each pages as page (page.key)}
			{#if page.type === 'ellipsis'}
				<Pagination.Item>
					<Pagination.Ellipsis />
				</Pagination.Item>
			{:else}
				<Pagination.Item>
					<Pagination.Link {page} isActive={currentPage === page.value}>
						{page.value}
					</Pagination.Link>
				</Pagination.Item>
			{/if}
		{/each}
		<Pagination.Item>
			<Pagination.NextButton>
				<span class="hidden sm:block">Next</span>
				<ChevronRight class="h-4 w-4" />
			</Pagination.NextButton>
		</Pagination.Item>
	</Pagination.Content>
</Pagination.Root>
