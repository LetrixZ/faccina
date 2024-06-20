<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Ordering, Sorting } from '$lib/models.js';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';

	const sortOptions = [
		{
			label: 'Date released',
			value: Sorting.RELEASED_AT,
		},
		{
			label: 'Date added',
			value: Sorting.CREATED_AT,
		},
		{
			label: 'Relevance',
			value: Sorting.RELEVANCE,
		},
		{
			label: 'Title',
			value: Sorting.TITLE,
		},
		{
			label: 'Pages',
			value: Sorting.PAGES,
		},
	];

	$: sort = ($page.url.searchParams.get('sort') as Sorting) || Sorting.RELEASED_AT;
	$: order = ($page.url.searchParams.get('order') as Ordering) || Ordering.DESC;

	$: sortOption = sort && sortOptions.find((option) => option.value === sort);
</script>

<div class="flex items-end justify-between gap-2">
	<div class="w-full space-y-0.5 md:w-fit">
		<Label>Sort by</Label>
		<Select.Root
			items={sortOptions}
			selected={sortOption}
			onSelectedChange={(option) => {
				const query = new URLSearchParams($page.url.searchParams.toString());
				query.set('sort', option?.value ?? Sorting.RELEASED_AT);
				goto(`?${query.toString()}`);
			}}
		>
			<Select.Trigger class="w-full md:w-48" aria-label="Select sorting option">
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
		variant="ghost"
		class="text-muted-foreground-light size-8 p-0"
		on:click={() => {
			const query = new URLSearchParams($page.url.searchParams.toString());
			query.set('order', order === Ordering.DESC ? Ordering.ASC : Ordering.DESC);
			goto(`?${query.toString()}`);
		}}
	>
		{#if order === Ordering.DESC}
			<span class="sr-only">Set ascending order</span>
			<ChevronDown />
		{:else}
			<span class="sr-only">Set descending order</span>
			<ChevronUp />
		{/if}
	</Button>
</div>
