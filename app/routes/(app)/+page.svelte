<script lang="ts">
	import ListItem from '$lib/components/list-item.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import SortOptions from '$lib/components/sort-options.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { randomInt } from '$lib/utils';

	export let data;
</script>

<svelte:head>
	<title>Home • {data.site.name}</title>
</svelte:head>

<main class="container relative space-y-2">
	{#await data.library}
		<p class="text-xl font-semibold text-foreground">Browse</p>

		<div class="grid items-end gap-2 md:flex">
			<SortOptions defaultOrder={data.site.defaultOrder} defaultSort={data.site.defaultSort} />
		</div>

		<Separator />

		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each new Array(8) as _}
				<div class="space-y-2">
					<div class="aspect-[90/127] w-full">
						<Skeleton class="h-full w-full" />
					</div>

					<div class="h-fit space-y-1.5">
						<Skeleton class="h-6 w-[80%]" />

						<div class="flex flex-wrap gap-1.5">
							{#each new Array(randomInt(2, 6)) as _}
								<Skeleton class="h-5" style={`width: ${randomInt(40, 90)}px`} />
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:then library}
		<p class="text-xl font-semibold text-foreground">Browse ({library.total})</p>

		<div class="grid items-end gap-2 md:flex">
			<SortOptions defaultOrder={data.site.defaultOrder} defaultSort={data.site.defaultSort} />
			<ListPagination
				class="mx-auto w-fit md:mx-0 md:ms-auto"
				limit={library.limit}
				total={library.total}
			/>
		</div>

		<Separator />

		{#if library.archives.length}
			<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
				{#each library.archives as archive (archive.id)}
					<ListItem {archive} />
				{/each}
			</div>
		{:else}
			<p class="mx-auto w-fit py-20 text-4xl font-medium">No results found</p>
		{/if}

		<Separator />

		<ListPagination
			class="mx-auto w-fit flex-grow md:mx-0 md:ms-auto md:flex-grow-0"
			limit={library.limit}
			total={library.total}
		/>
	{/await}
</main>
