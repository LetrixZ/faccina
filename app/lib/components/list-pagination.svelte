<script lang="ts">
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { createEventDispatcher } from 'svelte';
	import Button from './ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Pagination from '$lib/components/ui/pagination';
	import { cn } from '$lib/utils';


	interface Props {
		total: number;
		limit: number;
		value?: number | undefined;
		class?: string | null | undefined;
	}

	let {
		total,
		limit,
		value = undefined,
		class: className = undefined
	}: Props = $props();

	let currentPage = $derived((() => {
		if (value) {
			return value;
		}

		const currentPage = $page.url.searchParams.get('page');

		if (currentPage) {
			return parseInt(currentPage);
		} else {
			return 1;
		}
	})());

	const dispatch = createEventDispatcher<{ navigate: number }>();

	const getPageUrl = (page: number, url: URL) => {
		const query = new URLSearchParams(url.searchParams.toString());
		query.set('page', page.toString());

		return `${url.pathname}?${query.toString()}`;
	};

	let prevPage = $derived((() => {
		if (currentPage > 1) {
			return currentPage - 1;
		}
	})());

	let nextPage = $derived((() => {
		if (currentPage < Math.ceil(total / limit)) {
			return currentPage + 1;
		}
	})());

	let prevPageUrl = $derived((() => {
		if (currentPage > 1) {
			const query = new URLSearchParams($page.url.searchParams.toString());
			query.set('page', (currentPage - 1).toString());

			return `${$page.url.pathname}?${query.toString()}`;
		}
	})());

	let nextPageUrl = $derived((() => {
		if (currentPage < Math.ceil(total / limit)) {
			const query = new URLSearchParams($page.url.searchParams.toString());
			query.set('page', (currentPage + 1).toString());

			return `${$page.url.pathname}?${query.toString()}`;
		}
	})());

	
</script>

<Pagination.Root
	class={className}
	count={total || 1}
	
	
	onPageChange={(newPage) => {
		const query = new URLSearchParams($page.url.searchParams.toString());
		query.set('page', newPage.toString());
		goto(`?${query.toString()}`);
	}}
	page={currentPage}
	perPage={limit || 1}
>
	{#snippet children({ currentPage, pages })}
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
	{/snippet}
</Pagination.Root>
