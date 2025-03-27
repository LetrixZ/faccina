<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { ListPageType } from '$lib/types';
	import type { Order, Sort } from '../schemas';
	import { cn, randomString } from '../utils';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';
	import { createEventDispatcher } from 'svelte';

	export let type: ListPageType = 'main';
	export let defaultSort: Sort = 'released_at';
	export let defaultOrder: Order = 'desc';
	export let sort: Sort | undefined = undefined;
	export let order: Order | undefined = undefined;
	export let sortOptions: Sort[] = (() => {
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
	})();

	const dispatch = createEventDispatcher<{ sort: { sort: Sort; seed?: string }; order: Order }>();

	$: defaultSortType = (() => {
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
	})();

	$: defaultOrderType = (() => {
		switch (type) {
			case 'main':
				return defaultOrder;
			case 'favorites':
				return 'desc';
			case 'collection':
			case 'series':
				return 'asc';
		}
	})();

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

	$: sortValue = (() => {
		if (sort) {
			return sort;
		}

		return ($page.url.searchParams.get('sort') as Sort) ?? defaultSortType;
	})();

	$: orderValue = (() => {
		if (order) {
			return order;
		}

		return ($page.url.searchParams.get('order') as Order) ?? defaultOrderType;
	})();

	$: sortOption = sortValue && selectSortOptions.find((option) => option.value === sortValue);

	const newOrderQuery = () => {
		const query = new URLSearchParams($page.url.searchParams.toString());
		query.set('order', orderValue === 'desc' ? 'asc' : 'desc');
		return query.toString();
	};
</script>

<div class={cn('flex items-end gap-2', $$props.class)}>
	<div class="w-full space-y-0.5 md:w-fit">
		<Label>Sort by</Label>
		<Select.Root
			items={selectSortOptions}
			onSelectedChange={(option) => {
				const newSort = option?.value ?? defaultSortType;
				if (
					!dispatch(
						'sort',
						{ sort: newSort, seed: newSort === 'random' ? randomString() : undefined },
						{ cancelable: true }
					)
				) {
					return;
				}

				const query = new URLSearchParams($page.url.searchParams.toString());
				query.set('sort', option?.value ?? defaultSortType);

				if (option?.value === 'random') {
					if (!query.get('seed')) {
						query.set('seed', randomString());
					}
				} else {
					query.delete('seed');
				}

				goto(`?${query.toString()}`);
			}}
			preventScroll={false}
			selected={sortOption}
		>
			<Select.Trigger aria-label="Select sorting option" class="w-full sm:w-48">
				<Select.Value class="text-muted-foreground-light" />
			</Select.Trigger>
			<Select.Content>
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
		on:click={(ev) => {
			ev.preventDefault();

			if (!dispatch('order', orderValue === 'desc' ? 'asc' : 'desc', { cancelable: true })) {
				return;
			}

			const query = new URLSearchParams($page.url.searchParams.toString());
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
