<script lang="ts">
	import ListItem from '$lib/components/list-item.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { randomInt } from '$lib/utils';
	import { ListPagination, Separator, SortOptions } from 'shared';

	export let data;
</script>

<svelte:head>
	<title>Home • Faccina</title>
</svelte:head>

<main class="container relative space-y-2">
	{#await data.libraryPage}
		<p class="text-foreground text-xl font-semibold">Browse</p>

		<div class="grid items-end gap-2 md:flex">
			<SortOptions />
		</div>

		<Separator />

		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each new Array(12) as _}
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
	{:then libraryPage}
		<p class="text-foreground text-xl font-semibold">Browse ({libraryPage.total})</p>

		<div class="grid items-end gap-2 md:flex">
			<SortOptions />
			<ListPagination
				page={libraryPage.page}
				limit={libraryPage.limit}
				total={libraryPage.total || 1}
				class="mx-auto w-fit md:mx-0 md:ms-auto"
			/>
		</div>

		<Separator />

		{#if libraryPage.archives.length}
			<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
				{#each libraryPage.archives as archive (archive.id)}
					<ListItem {archive} />
				{/each}
			</div>
		{:else}
			<p class="mx-auto w-fit py-20 text-4xl font-medium">No results found</p>
		{/if}

		<Separator />

		<ListPagination
			page={libraryPage.page}
			limit={libraryPage.limit}
			total={libraryPage.total || 1}
			class="mx-auto w-fit flex-grow md:mx-0 md:ms-auto md:flex-grow-0"
		/>
	{/await}
</main>
