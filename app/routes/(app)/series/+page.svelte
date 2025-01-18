<script lang="ts">
	import { page } from '$app/stores';
	import ListNavbar from '$lib/components/list-navbar.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	export let data;

	$: library = data.libraryPage;
</script>

<main class="container relative flex flex-auto flex-col gap-y-2">
	<PageTitle>
		Series

		<Button class="ms-auto h-fit w-fit p-2" href="/series/new" variant="link">
			Create a new series
		</Button>
	</PageTitle>

	<div class="grid items-end gap-2 md:flex">
		<ListNavbar
			defaultSort="updated_at"
			{library}
			sortOptions={['updated_at', 'created_at', 'title']}
		/>
	</div>

	<Separator />

	{#if library.data.length}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each library.data as series (series.id)}
				<div class="group h-auto w-auto space-y-2 text-center">
					<a href={`/series/${series.id}${$page.url.search}`} tabindex="-1">
						<div class="relative aspect-[45/64] overflow-clip rounded-md bg-neutral-800 shadow">
							{#if series.thumbnail}
								<img
									alt={`'${series.title}' cover`}
									class="aspect-[45/64] bg-neutral-800 object-contain"
									height={910}
									loading="eager"
									src="/image/{series.hash}/{series.thumbnail}?type=cover"
									width={640}
								/>
							{/if}
						</div>
					</a>

					<div class="h-fit">
						<a
							class="line-clamp-2 pe-2 font-medium leading-6 underline-offset-4 hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none group-hover:text-foreground"
							href={`/series/${series.id}${$page.url.search}`}
							title={series.title}
						>
							{series.title}
						</a>

						{#if series.chapterCount > 1}
							<p class="text-sm text-neutral-300">{series.chapterCount} chapters</p>
						{:else if series.chapterCount === 1}
							<p class="text-sm text-neutral-300">1 chapter</p>
						{:else}
							<p class="text-sm text-neutral-300">No chapters</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="mx-auto my-auto w-fit text-2xl font-medium">No results found</p>
	{/if}

	<Separator />

	<ListPagination
		class="mx-auto w-fit md:mx-0 md:ms-auto md:flex-grow-0"
		limit={library.limit}
		total={library.total}
	/>
</main>
