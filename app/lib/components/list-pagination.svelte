<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import type { Pagination } from '$lib/types';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		class?: ClassValue;
		library: Pagination<unknown>;
		onNavigate?: (navigate: number) => boolean;
	};

	let { class: className, library, onNavigate }: Props = $props();

	const pageCount = $derived(library.total ? Math.ceil(library.total / library.limit) : 0);

	const prevPage = $derived.by(() => {
		if (library.page > 1) {
			return library.page - 1;
		}
	});

	const nextPage = $derived.by(() => {
		if (library.page < Math.ceil(library.total / library.limit)) {
			return library.page + 1;
		}
	});

	const prevPageUrl = $derived.by(() => {
		if (library.page > 1) {
			const query = new URLSearchParams(page.url.searchParams.toString());
			query.set('page', (library.page - 1).toString());

			return `${page.url.pathname}?${query.toString()}`;
		}
	});

	const nextPageUrl = $derived.by(() => {
		if (library.page < Math.ceil(library.total / library.limit)) {
			const query = new URLSearchParams(page.url.searchParams.toString());
			query.set('page', (library.page + 1).toString());

			return `${page.url.pathname}?${query.toString()}`;
		}
	});

	const pageUrl = (pageNumber: number) => {
		const query = new URLSearchParams(page.url.searchParams.toString());
		query.set('page', pageNumber.toString());

		return `${page.url.pathname}?${query.toString()}`;
	};

	type PaginationOption = { type: 'page'; page: number } | { type: 'ellipsis' };

	/**
	 * https://stackoverflow.com/a/74345964/6785387
	 */
	const generatePagination = (currentPage: number, pageCount: number): PaginationOption[] => {
		if (pageCount === 0) {
			return [{ type: 'page', page: 1 }];
		} else if (pageCount <= 4) {
			const pages = [...new Array(pageCount)].map((_, index) => ({
				type: 'page' as const,
				page: index + 1,
			}));

			return pages;
		}

		const pages: PaginationOption[] = [{ type: 'page', page: 1 }];

		if (currentPage >= 4) {
			pages.push({ type: 'ellipsis' });
		}

		if (currentPage + 1 > pageCount) {
			pages.push({ type: 'page', page: currentPage - 2 });
		}

		if (currentPage - 1 > 1) {
			pages.push({ type: 'page', page: currentPage - 1 });
		}

		if (currentPage !== 1) {
			pages.push({ type: 'page', page: currentPage });
		}

		if (currentPage + 1 <= pageCount) {
			pages.push({ type: 'page', page: currentPage + 1 });
		}

		if (currentPage - 1 <= 0) {
			pages.push({ type: 'page', page: currentPage + 2 });
		}

		if (currentPage + 2 < pageCount) {
			pages.push({ type: 'ellipsis' });
		}

		if (currentPage + 1 < pageCount) {
			pages.push({ type: 'page', page: pageCount });
		}

		return pages;
	};

	const pageOptions = $derived(generatePagination(library.page, pageCount));
</script>

{#snippet navButton(name: 'Prev' | 'Next', page: number | undefined, url: string | undefined)}
	<a
		class={cn(
			'flex h-full items-center rounded-md border border-transparent text-sm font-medium',
			!url && 'disabled'
		)}
		href={url ?? '#'}
		onclick={(ev) => {
			if ((onNavigate && onNavigate(page!) === false) || !url) {
				ev.preventDefault();
				ev.stopPropagation();
			}
		}}
		title={name}
	>
		{#if name === 'Prev'}
			<ChevronLeft class="size-4.5" />
			<span class="hidden px-2 md:block"> {name} </span>
		{:else}
			<span class="hidden px-2 md:block"> {name} </span>
			<ChevronRight class="size-4.5" />
		{/if}
	</a>
{/snippet}

<div class={cn('flex items-center gap-1', className)}>
	{@render navButton('Prev', prevPage, prevPageUrl)}

	{#each pageOptions as page, index (index)}
		{#if page.type === 'page'}
			{@const current = library.page === page.page}
			<a
				class={cn(
					'flex items-center justify-center rounded-md border border-transparent text-sm font-medium',
					String(page.page).length < 3 ? 'size-7' : 'h-7 px-2'
				)}
				aria-current={current ? 'page' : undefined}
				href={pageUrl(page.page)}
				onclick={(ev) => onNavigate?.(page.page) === false && ev.preventDefault()}
			>
				{page.page}
			</a>
		{:else}
			<button class="pointer-events-none flex items-center justify-center select-none">
				<Ellipsis class="size-4" />
			</button>
		{/if}
	{/each}

	{@render navButton('Next', nextPage, nextPageUrl)}
</div>

<style>
	a {
		transition:
			color 100ms ease,
			background-color 100ms ease,
			scale 75ms;

		@media (prefers-reduced-motion: reduce) {
			transition: none;
		}

		&.disabled {
			color: color-mix(in oklab, var(--color-neutral-500) 85%, var(--color-accent));
			cursor: not-allowed;
		}

		&:visited {
			display: none !important;
		}

		&:not(.disabled) {
			&:hover {
				@media (hover: hover) {
					background-color: --alpha(
						color-mix(in oklab, var(--color-neutral-800) 80%, var(--color-accent)) / 40%
					);
				}
			}

			&:active {
				scale: 0.98;
			}
		}
	}

	a[aria-current] {
		border-color: --alpha(
			color-mix(in oklab, var(--color-neutral-700) 80%, var(--color-accent)) / 40%
		);
	}
</style>
