<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';

	import type { Order, Sort } from '../schemas';

	import { randomString } from '../utils';

	export let favorites = false;
	export let defaultSort: Sort = 'released_at';
	export let defaultOrder: Order = 'desc';

	const sortOptions: { label: string; value: Sort }[] = [
		{ label: 'Date released', value: 'released_at' },
		{ label: 'Date added', value: 'created_at' },
		{ label: 'Title', value: 'title' },
		{ label: 'Pages', value: 'pages' },
		{ label: 'Random', value: 'random' },
		...(favorites ? [{ label: 'Favorited on', value: 'saved_at' as Sort }] : []),
	];

	$: sort = (($page.url.searchParams.get('sort') as Sort) ?? favorites) ? 'saved_at' : defaultSort;
	$: order = ($page.url.searchParams.get('order') as Order) ?? defaultOrder;

	$: sortOption = sort && sortOptions.find((option) => option.value === sort);
</script>

<div class="flex items-end justify-between gap-2">
	<div class="w-full space-y-0.5 md:w-fit">
		<Label>Sort by</Label>
		<Select.Root
			items={sortOptions}
			onSelectedChange={(option) => {
				const query = new URLSearchParams($page.url.searchParams.toString());
				query.set('sort', (option?.value ?? favorites) ? 'saved_at' : defaultSort);

				if (option?.value === 'random') {
					if (!query.get('seed')) {
						query.set('seed', randomString());
					}
				} else {
					query.delete('seed');
				}

				goto(`?${query.toString()}`);
			}}
			selected={sortOption}
		>
			<Select.Trigger aria-label="Select sorting option" class="w-full md:w-48">
				<Select.Value class="text-muted-foreground-light" />
			</Select.Trigger>
			<Select.Content>
				{#each sortOptions as option}
					<Select.Item value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<Button
		class="size-8 p-0 text-muted-foreground-light"
		disabled={sort === 'random'}
		on:click={() => {
			const query = new URLSearchParams($page.url.searchParams.toString());
			query.set('order', order === 'desc' ? 'asc' : 'desc');
			goto(`?${query.toString()}`);
		}}
		variant="ghost"
	>
		{#if order === 'desc'}
			<span class="sr-only">Set ascending order</span>
			<ChevronDown />
		{:else}
			<span class="sr-only">Set descending order</span>
			<ChevronUp />
		{/if}
	</Button>
</div>
