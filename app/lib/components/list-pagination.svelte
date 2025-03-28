<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Pagination from '$lib/components/ui/pagination';
	import { cn } from '$lib/utils';
	import Button from './ui/button/button.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		total: number;
		limit: number;
		value?: number;
		class?: ClassValue | null;
		onNavigate?: (navigate: number) => boolean;
	};

	let { total, limit, value, class: className, onNavigate }: Props = $props();

	const currentPage = $derived.by(() => {
		if (value) {
			return value;
		}

		const currentPage = page.url.searchParams.get('page');

		if (currentPage) {
			return parseInt(currentPage);
		} else {
			return 1;
		}
	});

	const getPageUrl = (page: number, url: URL) => {
		const query = new URLSearchParams(url.searchParams.toString());
		query.set('page', page.toString());

		return `${url.pathname}?${query.toString()}`;
	};

	const prevPage = $derived.by(() => {
		if (currentPage > 1) {
			return currentPage - 1;
		}
	});

	const nextPage = $derived.by(() => {
		if (currentPage < Math.ceil(total / limit)) {
			return currentPage + 1;
		}
	});

	const prevPageUrl = $derived.by(() => {
		if (currentPage > 1) {
			const query = new URLSearchParams(page.url.searchParams.toString());
			query.set('page', (currentPage - 1).toString());

			return `${page.url.pathname}?${query.toString()}`;
		}
	});

	const nextPageUrl = $derived.by(() => {
		if (currentPage < Math.ceil(total / limit)) {
			const query = new URLSearchParams(page.url.searchParams.toString());
			query.set('page', (currentPage + 1).toString());

			return `${page.url.pathname}?${query.toString()}`;
		}
	});
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
						if (onNavigate && !onNavigate(prevPage || 1)) {
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
							href={getPageUrl(_page.value, page.url)}
							onclick={(ev) => {
								if (!onNavigate?.(_page.value)) {
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
					onclick={(ev) => {
						if (!onNavigate?.(nextPage || 1)) {
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
