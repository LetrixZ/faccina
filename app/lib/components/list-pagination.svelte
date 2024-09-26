<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Pagination from '$lib/components/ui/pagination';
	import { cn } from '$lib/utils';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';

	import Button from './ui/button/button.svelte';

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
	export let limit = 24;
	export { className as class };

	const getPageUrl = (page: number, searchParams: URLSearchParams) => {
		const query = new URLSearchParams(searchParams.toString());
		query.set('page', page.toString());

		return `/?${query.toString()}`;
	};

	$: prevPageUrl = (() => {
		if (currentPage > 1) {
			const query = new URLSearchParams($page.url.searchParams.toString());
			query.set('page', (currentPage - 1).toString());

			return `/?${query.toString()}`;
		}
	})();

	$: nextPageUrl = (() => {
		if (currentPage < Math.ceil(total / limit)) {
			const query = new URLSearchParams($page.url.searchParams.toString());
			query.set('page', (currentPage + 1).toString());

			return `/?${query.toString()}`;
		}
	})();
</script>

<Pagination.Root
	class={className}
	count={total}
	let:currentPage
	let:pages
	onPageChange={(newPage) => {
		const query = new URLSearchParams($page.url.searchParams.toString());
		query.set('page', newPage.toString());
		goto(`?${query.toString()}`);
	}}
	page={currentPage}
	perPage={limit}
>
	<Pagination.Content>
		<Pagination.Item>
			<Button
				class={cn('gap-1 pl-2.5', !prevPageUrl && 'pointer-events-none opacity-50')}
				href={prevPageUrl}
				size="sm"
				variant="ghost"
			>
				<ChevronLeft class="h-4 w-4" />
				<span class="hidden sm:block">Previous</span>
			</Button>
		</Pagination.Item>
		{#each pages as _page (_page.key)}
			{#if _page.type === 'ellipsis'}
				<Pagination.Item>
					<Pagination.Ellipsis />
				</Pagination.Item>
			{:else}
				<Pagination.Item>
					<Button
						href={getPageUrl(_page.value, $page.url.searchParams)}
						size="sm"
						variant={_page.value === currentPage ? 'outline' : 'ghost'}
					>
						{_page.value}
					</Button>
				</Pagination.Item>
			{/if}
		{/each}
		<Pagination.Item>
			<Button
				class={cn('gap-1 pl-2.5', !nextPageUrl && 'pointer-events-none opacity-50')}
				href={nextPageUrl}
				size="sm"
				variant="ghost"
			>
				<span class="hidden sm:block">Next</span>
				<ChevronRight class="h-4 w-4" />
			</Button>
		</Pagination.Item>
	</Pagination.Content>
</Pagination.Root>
