<script lang="ts">
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { createEventDispatcher } from 'svelte';
	import Button from './ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Pagination from '$lib/components/ui/pagination';
	import { cn } from '$lib/utils';

	export let total: number;
	export let limit: number;
	export let value: number | undefined = undefined;

	let className: string | null | undefined = undefined;

	$: currentPage = (() => {
		if (value) {
			return value;
		}

		const currentPage = $page.url.searchParams.get('page');

		if (currentPage) {
			return parseInt(currentPage);
		} else {
			return 1;
		}
	})();

	const dispatch = createEventDispatcher<{ navigate: number }>();

	const getPageUrl = (page: number, url: URL) => {
		const query = new URLSearchParams(url.searchParams.toString());
		query.set('page', page.toString());

		return `${url.pathname}?${query.toString()}`;
	};

	$: prevPage = (() => {
		if (currentPage > 1) {
			return currentPage - 1;
		}
	})();

	$: nextPage = (() => {
		if (currentPage < Math.ceil(total / limit)) {
			return currentPage + 1;
		}
	})();

	$: prevPageUrl = (() => {
		if (currentPage > 1) {
			const query = new URLSearchParams($page.url.searchParams.toString());
			query.set('page', (currentPage - 1).toString());

			return `${$page.url.pathname}?${query.toString()}`;
		}
	})();

	$: nextPageUrl = (() => {
		if (currentPage < Math.ceil(total / limit)) {
			const query = new URLSearchParams($page.url.searchParams.toString());
			query.set('page', (currentPage + 1).toString());

			return `${$page.url.pathname}?${query.toString()}`;
		}
	})();

	export { className as class };
</script>

<Pagination.Root
	class={className}
	count={total || 1}
	let:currentPage
	let:pages
	onPageChange={(newPage) => {
		const query = new URLSearchParams($page.url.searchParams.toString());
		query.set('page', newPage.toString());
		goto(`?${query.toString()}`);
	}}
	page={currentPage}
	perPage={limit || 1}
>
	<Pagination.Content>
		<Pagination.Item class="me-auto md:me-0">
			<Button
				class={cn('gap-1 pl-2.5', !prevPageUrl && 'pointer-events-none opacity-50')}
				href={prevPageUrl}
				on:click={(ev) => {
					if (!dispatch('navigate', prevPage || 1, { cancelable: true })) {
						ev.preventDefault();
					}
				}}
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
						href={getPageUrl(_page.value, $page.url)}
						on:click={(ev) => {
							if (!dispatch('navigate', _page.value, { cancelable: true })) {
								ev.preventDefault();
							}
						}}
						size="sm"
						variant={_page.value === currentPage ? 'outline' : 'ghost'}
					>
						{_page.value}
					</Button>
				</Pagination.Item>
			{/if}
		{/each}
		<Pagination.Item class="ms-auto md:ms-0">
			<Button
				class={cn('gap-1 pl-2.5', !nextPageUrl && 'pointer-events-none  opacity-50 ')}
				href={nextPageUrl}
				on:click={(ev) => {
					if (!dispatch('navigate', nextPage || 1, { cancelable: true })) {
						ev.preventDefault();
					}
				}}
				size="sm"
				variant="ghost"
			>
				<span class="hidden sm:block">Next</span>
				<ChevronRight class="h-4 w-4" />
			</Button>
		</Pagination.Item>
	</Pagination.Content>
</Pagination.Root>
