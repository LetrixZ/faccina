<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import type { ListPageType } from '$lib/types.js';
	import type { Order, Sort } from '../schemas.js';
	import { cn, randomString } from '../utils.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import type { ClassValue } from 'svelte/elements';

	let {
		class: className = '',
		type = 'main',
		defaultSort = 'released_at',
		defaultOrder = 'desc',
		sort = undefined,
		order = undefined,
		sortOptions = (() => {
			const options: Sort[] = [];

			switch (type) {
				case 'favorites':
					options.push('saved_at');
					break;
				case 'collection':
					options.push('collection_order');
					break;
				case 'series':
					options.push('series_order');
					break;
			}

			switch (type) {
				case 'main':
				case 'favorites':
				case 'collection':
				case 'series':
					options.push(
						...[
							'released_at' as const,
							'created_at' as const,
							'title' as const,
							'pages' as const,
							'random' as const
						]
					);
			}

			return options;
		})(),
		onSort,
		onOrder
	}: {
		class?: ClassValue;
		type?: ListPageType;
		defaultSort?: Sort;
		defaultOrder?: Order;
		sort?: Sort;
		order?: Order;
		sortOptions?: Sort[];
		onSort?: (detail: { sort: Sort; seed?: string }) => boolean;
		onOrder?: (detail: Order) => boolean;
	} = $props();

	const selectSortOptions: { label: string; value: Sort }[] = (() => {
		const options = [
			{ label: 'Date released', value: 'released_at' as const },
			{ label: 'Date added', value: 'created_at' as const },
			{ label: 'Date updated', value: 'updated_at' as const },
			{ label: 'Title', value: 'title' as const },
			{ label: 'Pages', value: 'pages' as const },
			{ label: 'Random', value: 'random' as const },
			{ label: 'Favorited on', value: 'saved_at' as const },
			{ label: 'Order', value: 'collection_order' as const },
			{ label: 'Order', value: 'series_order' as const }
		].filter((option) => (sortOptions ? sortOptions?.includes(option.value) : true));

		if (sortOptions) {
			options.sort((a, b) => sortOptions.indexOf(a.value) - sortOptions.indexOf(b.value));
		}

		return options;
	})();

	const defaultSortType = $derived.by(() => {
		switch (type) {
			case 'main':
				return defaultSort;
			case 'favorites':
				return 'saved_at' as Sort;
			case 'collection':
				return 'collection_order' as Sort;
			case 'series':
				return 'series_order' as Sort;
		}
	});

	const defaultOrderType = $derived.by(() => {
		switch (type) {
			case 'main':
				return defaultOrder;
			case 'favorites':
				return 'desc' as Order;
			case 'collection':
			case 'series':
				return 'asc' as Order;
		}
	});

	const sortValue = $derived(
		sort ?? (page.url.searchParams.get('sort') as Sort) ?? defaultSortType
	);

	const orderValue = $derived(
		order ?? (page.url.searchParams.get('order') as Order) ?? defaultOrderType
	);

	const triggerContent = $derived(
		selectSortOptions.find((option) => option.value === sortValue)?.label ?? 'Select sorting option'
	);

	const newOrderQuery = () => {
		const query = new URLSearchParams(page.url.searchParams.toString());
		query.set('order', orderValue === 'desc' ? 'asc' : 'desc');
		return query.toString();
	};
</script>

<div class={cn('flex items-end gap-2', className)}>
	<div class="w-full space-y-2 md:w-fit">
		<Label>Sort by</Label>
		<Select.Root
			items={selectSortOptions}
			onValueChange={(value) => {
				const newSort = (value ?? defaultSortType) as Sort;

				const result = onSort?.({
					sort: newSort,
					seed: newSort === 'random' ? randomString() : undefined
				});

				if (result) {
					return;
				}

				const query = new URLSearchParams(page.url.searchParams.toString());
				query.set('sort', value ?? defaultSortType);

				if (value === 'random') {
					if (!query.get('seed')) {
						query.set('seed', randomString());
					}
				} else {
					query.delete('seed');
				}

				goto(`?${query.toString()}`);
			}}
			type="single"
			value={sortValue}
		>
			<Select.Trigger aria-label="Select sorting option" class="w-full sm:w-48">
				{triggerContent}
			</Select.Trigger>
			<Select.Content preventScroll={false}>
				{#each selectSortOptions as option (option.value)}
					<Select.Item label={option.label} value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<Button
		class={cn(
			'size-9 p-0 text-muted-foreground-light',
			sortValue === 'random' && 'pointer-events-none opacity-50'
		)}
		href="?{newOrderQuery()}"
		onclick={(ev) => {
			ev.preventDefault();

			const result = onOrder?.(orderValue === 'desc' ? 'asc' : 'desc');
			if (result) {
				return;
			}

			const query = new URLSearchParams(page.url.searchParams.toString());
			query.set('order', orderValue === 'desc' ? 'asc' : 'desc');
			goto(`?${query.toString()}`);
		}}
		variant="ghost"
	>
		{#if orderValue === 'desc'}
			<span class="sr-only">Set ascending order</span>
			<ChevronDown />
		{:else}
			<span class="sr-only">Set descending order</span>
			<ChevronUp />
		{/if}
	</Button>
</div>
