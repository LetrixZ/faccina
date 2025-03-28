<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { ListPageType } from '$lib/types';
	import type { Order, Sort } from '../schemas';
	import { cn, randomString } from '../utils';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import type { ClassValue } from 'svelte/elements';

	const getSortOptions = (type: ListPageType) => {
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
						'random' as const,
					]
				);
		}

		return options;
	};

	type Props = {
		class?: ClassValue | null;
		type?: ListPageType;
		defaultSort?: Sort;
		defaultOrder?: Order;
		sortOptions?: Sort[];
		sort?: Sort;
		order?: Order;
		onSort?: (sort: Sort, seed?: string) => boolean;
		onOrder?: (order: Order) => boolean;
	};

	let {
		class: className,
		type = 'main',
		defaultSort = 'released_at',
		defaultOrder = 'desc',
		sortOptions: userSortOptions,
		sort,
		order,
		onSort,
		onOrder,
	}: Props = $props();

	const sortOptions = $derived(userSortOptions ? userSortOptions : getSortOptions(type));

	const defaultSortType = $derived.by(() => {
		switch (type) {
			case 'main':
				return defaultSort;
			case 'favorites':
				return 'saved_at';
			case 'collection':
				return 'collection_order';
			case 'series':
				return 'series_order';
		}
	});

	const defaultOrderType = $derived.by(() => {
		switch (type) {
			case 'main':
				return defaultOrder;
			case 'favorites':
				return 'desc';
			case 'collection':
			case 'series':
				return 'asc';
		}
	});

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
			{ label: 'Order', value: 'series_order' as const },
		].filter((option) => (sortOptions ? sortOptions?.includes(option.value) : true));

		if (sortOptions) {
			options.sort((a, b) => sortOptions.indexOf(a.value) - sortOptions.indexOf(b.value));
		}

		return options;
	})();

	const sortValue = $derived.by(() => {
		if (sort) {
			return sort;
		}

		return (page.url.searchParams.get('sort') as Sort) ?? defaultSortType;
	});

	const orderValue = $derived.by(() => {
		if (order) {
			return order;
		}

		return (page.url.searchParams.get('order') as Order) ?? defaultOrderType;
	});

	const sortOption = $derived(
		sortValue && selectSortOptions.find((option) => option.value === sortValue)
	);

	const newOrderQuery = () => {
		const query = new URLSearchParams(page.url.searchParams.toString());
		query.set('order', orderValue === 'desc' ? 'asc' : 'desc');
		return query.toString();
	};

	const selectedLabel = $derived(
		sortValue ? selectSortOptions.find((option) => option.value === sortValue)?.label : ''
	);
</script>

<div class={cn('flex items-end gap-2', className)}>
	<div class="w-full space-y-0.5 md:w-fit">
		<Label>Sort by</Label>
		<Select.Root
			items={selectSortOptions}
			value={sortOption?.value}
			type="single"
			onValueChange={(value) => {
				const newSort = value ?? defaultSortType;

				if (onSort && !onSort(newSort as Sort, newSort === 'random' ? randomString() : undefined)) {
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
		>
			<Select.Trigger
				aria-label="Select sorting option"
				class="w-full sm:w-48 text-muted-foreground-light"
			>
				{selectedLabel}
			</Select.Trigger>
			<Select.Content preventScroll={false}>
				{#each selectSortOptions as option}
					<Select.Item value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<Button
		class={cn(
			'text-muted-foreground-light size-8 p-0',
			sortValue === 'random' && 'pointer-events-none opacity-50'
		)}
		href="?{newOrderQuery()}"
		onclick={(ev) => {
			ev.preventDefault();

			if (onOrder && !onOrder(orderValue === 'desc' ? 'asc' : 'desc')) {
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
