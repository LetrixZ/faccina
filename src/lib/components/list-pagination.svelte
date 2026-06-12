<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Pagination from '$lib/components/ui/pagination';
	import { cn } from '$lib/utils.js';
	import { Button } from './ui/button/index.js';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { ClassValue } from 'svelte/elements';

	let {
		class: className,
		total,
		limit,
		value,
		onNavigate
	}: {
		class: ClassValue;
		total: number;
		limit: number;
		value?: number;
		onNavigate?: (page: number) => void;
	} = $props();

	const currentPage = $derived(value ?? parseInt(page.url.searchParams.get('page') ?? '1'));

	const getPageUrl = (pageNum: number, url: URL) => {
		const query = new URLSearchParams(url.searchParams.toString());
		query.set('page', pageNum.toString());

		return `${url.pathname}?${query.toString()}`;
	};

	const prevPage = $derived(currentPage > 1 ? currentPage - 1 : undefined);

	const nextPage = $derived(currentPage < Math.ceil(total / limit) ? currentPage + 1 : undefined);

	const prevPageUrl = $derived(currentPage > 1 ? getPageUrl(currentPage - 1, page.url) : undefined);

	const nextPageUrl = $derived(
		currentPage < Math.ceil(total / limit) ? getPageUrl(currentPage + 1, page.url) : undefined
	);
</script>

<Pagination.Root
	class={className}
	count={total || 1}
	onPageChange={(newPage) => {
		const query = new URLSearchParams(page.url.searchParams.toString());
		query.set('page', newPage.toString());
		goto(`?${query.toString()}`);
	}}
	page={currentPage}
	perPage={limit || 1}
>
	{#snippet children({ pages, currentPage })}
		<Pagination.Content>
			<Pagination.Item class="me-auto md:me-0">
				<Button
					class={cn('gap-1 pl-2.5', !prevPageUrl && 'pointer-events-none opacity-50')}
					href={prevPageUrl}
					onclick={(ev) => {
						const result = onNavigate?.(prevPage || 1);
						if (result) {
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
			{#each pages as pageItem (pageItem.key)}
				{#if pageItem.type === 'ellipsis'}
					<Pagination.Item>
						<Pagination.Ellipsis />
					</Pagination.Item>
				{:else}
					<Pagination.Item>
						<Button
							href={getPageUrl(pageItem.value, page.url)}
							onclick={(ev) => {
								const result = onNavigate?.(pageItem.value);
								if (result) {
									ev.preventDefault();
								}
							}}
							size="sm"
							variant={pageItem.value === currentPage ? 'outline' : 'ghost'}
						>
							{pageItem.value}
						</Button>
					</Pagination.Item>
				{/if}
			{/each}
			<Pagination.Item class="ms-auto md:ms-0">
				<Button
					class={cn('gap-1 pl-2.5', !nextPageUrl && 'pointer-events-none  opacity-50 ')}
					href={nextPageUrl}
					onclick={(ev) => {
						const result = onNavigate?.(nextPage || 1);
						if (result) {
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
