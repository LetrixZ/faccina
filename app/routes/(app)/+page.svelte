<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import GalleryList from '$lib/components/new/gallery-list.svelte';
	import IconButton from '$lib/components/new/icon-button.svelte';
	import Select from '$lib/components/new/select.svelte';
	import Separator from '$lib/components/newnew/separator.svelte';
	import { mainSortOptions } from '$lib/utils';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';

	const { data } = $props();

	const limitOptions = $derived(
		data.site.pageLimits.map((limit) => ({ value: limit.toString(), label: limit.toString() }))
	);

	function filterChange() {
		const url = data.query.toURL(page.url, data.site);
		goto(url);
	}
</script>

<svelte:head>
	<title>Home • {data.site.name}</title>
</svelte:head>

<div class="flex grow flex-col items-center gap-2">
	<div class="mx-auto flex w-full flex-col">
		<div class="flex w-full flex-col items-end justify-between gap-y-2 md:flex-row">
			<div class="flex w-full gap-2 md:w-fit">
				<div class="flex w-fit flex-col gap-1">
					<span class="text-xsm font-medium">Per page</span>
					<Select
						items={limitOptions}
						onValueChange={(value) => {
							data.query.limit = +value;
							filterChange();
						}}
						triggerClass="min-w-28"
						type="single"
						value={data.query.limit.toString()}
					/>
				</div>

				<div class="flex items-end gap-2">
					<div class="flex w-fit flex-col gap-1">
						<span class="text-xsm font-medium">Sort by</span>
						<Select
							items={mainSortOptions}
							onValueChange={filterChange}
							triggerClass="min-w-42"
							type="single"
							bind:value={data.query.sort}
						/>
					</div>

					<IconButton
						class="size-7 p-0.5"
						onclick={() => {
							data.query.toggleOrder();
							filterChange();
						}}
					>
						{#if data.query.order === 'asc'}
							<ChevronUp class="h-full w-full" />
						{:else}
							<ChevronDown class="h-full w-full" />
						{/if}
					</IconButton>
				</div>
			</div>

			<div
				class="mx-auto flex w-full justify-between gap-y-0.5 max-md:items-center md:mx-0 md:w-fit md:flex-col"
			>
				<p class="pe-3 text-center text-sm font-medium md:text-end">
					Found {data.library.total} results
				</p>
				<ListPagination library={data.library} />
			</div>
		</div>
	</div>

	{#if data.library.data.length}
		<GalleryList galleries={data.library.data} />
	{:else}
		<div class="grow">
			<p>No results found</p>
		</div>
	{/if}

	<Separator />

	<ListPagination class="mx-auto w-fit md:mx-0 md:ms-auto md:w-fit" library={data.library} />
</div>
