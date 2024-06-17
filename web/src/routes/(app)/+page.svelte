<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ListItem from '$lib/components/list-item.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { Ordering, Sorting } from '$lib/models.js';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';

	export let data;

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

	$: libraryPage = data.libraryPage;
	$: archives = data.libraryPage.archives;
</script>

<svelte:head>
	<title>Home • Faccina</title>
</svelte:head>

<main class="container space-y-2">
	<p class="text-xl font-semibold text-foreground">Browse ({libraryPage.total})</p>

	<div class="grid items-end gap-2 md:flex">
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
				class="size-8 p-0 text-muted-foreground-light"
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

		<ListPagination total={libraryPage.total || 1} class="mx-auto w-fit md:mx-0 md:ms-auto" />
	</div>

	<Separator />

	{#if archives.length}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each archives as archive (archive.id)}
				<ListItem {archive} />
			{/each}
		</div>
	{:else}
		<p class="mx-auto w-fit py-20 text-4xl font-medium">No results found</p>
	{/if}

	<Separator />

	<ListPagination
		total={libraryPage.total || 1}
		class="mx-auto w-fit flex-grow md:mx-0 md:ms-auto md:flex-grow-0"
	/>
</main>
