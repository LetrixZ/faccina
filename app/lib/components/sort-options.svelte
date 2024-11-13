<!-- @migration-task Error while migrating Svelte code: $$props is used together with named props in a way that cannot be automatically migrated. -->
<script lang="ts">
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';
	import { createEventDispatcher } from 'svelte';
	import type { Order, Sort } from '../schemas';
	import { cn, randomString } from '../utils';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';

	export let type: 'main' | 'favorites' | 'collection' = 'main';
	export let defaultSort: Sort = 'released_at';
	export let defaultOrder: Order = 'desc';
	export let sort: Sort | undefined = undefined;
	export let order: Order | undefined = undefined;

	const dispatch = createEventDispatcher<{ sort: Sort; order: Order }>();

	$: defaultSortType = (() => {
		switch (type) {
			case 'main':
				return defaultSort;
			case 'favorites':
				return 'saved_at';
			case 'collection':
				return 'collection_order';
		}
	})();

	const sortOptions: { label: string; value: Sort }[] = [
		{ label: 'Date released', value: 'released_at' },
		{ label: 'Date added', value: 'created_at' },
		{ label: 'Title', value: 'title' },
		{ label: 'Pages', value: 'pages' },
		{ label: 'Random', value: 'random' },
		...(type === 'favorites' ? [{ label: 'Favorited on', value: 'saved_at' as Sort }] : []),
		...(type === 'collection' ? [{ label: 'Order', value: 'collection_order' as Sort }] : []),
	];

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

		return ($page.url.searchParams.get('order') as Order) ?? defaultOrder;
	})();

	$: sortOption = sortValue && sortOptions.find((option) => option.value === sortValue);
</script>

<div class={cn('flex items-end gap-2', $$props.class)}>
	<div class="w-full space-y-0.5 md:w-fit">
		<Label>Sort by</Label>
		<Select.Root
			items={sortOptions}
			onValueChange={(value) => {
				if (!dispatch('sort', (value as Sort) ?? defaultSortType, { cancelable: true })) {
					return;
				}

				const query = new URLSearchParams($page.url.searchParams.toString());
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
			value={sortOption?.value}
		>
			<Select.Trigger aria-label="Select sorting option" class="w-full sm:w-48" />
			<Select.Content preventScroll={false}>
				{#each sortOptions as option}
					<Select.Item value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<Button
		class="size-8 p-0 text-muted-foreground-light"
		disabled={sortValue === 'random'}
		onclick={() => {
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
