<script lang="ts">
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash from 'lucide-svelte/icons/trash';
	import ListItem from '$lib/components/list-item.svelte';
	import ListNavbar from '$lib/components/list-navbar.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { enhance } from '$app/forms';

	export let data;

	let deleteOpen = false;

	$: library = data.libraryPage;
</script>

<svelte:head>
	<title>{data.series.title} Series • {data.site.name}</title>
</svelte:head>

<main class="container relative flex flex-auto flex-col gap-y-2">
	<PageTitle>
		{data.series.title} ({library.total})

		{#if data.user?.admin}
			<div class="flex gap-2">
				<Button class="ms-2 h-fit w-fit p-2" href="/series/{data.series.id}/edit" variant="outline">
					<Pencil class="size-4" />
				</Button>

				<Dialog.Root onOpenChange={(open) => (deleteOpen = open)} open={deleteOpen}>
					<Dialog.Trigger>
						<Button class="flex size-8 gap-2 p-2" title="Remove series" variant="destructive">
							<span class="sr-only"> Remove series </span>
							<Trash />
						</Button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Are you sure you want to delete this series?</Dialog.Title>
							<Dialog.Description>This action can't be undone.</Dialog.Description>
						</Dialog.Header>

						<div class="flex w-full gap-2">
							<Button class="flex-auto" on:click={() => (deleteOpen = false)} variant="secondary">
								Cancel
							</Button>

							<form action="?/remove" class="flex-auto" method="POST" use:enhance>
								<Button class="w-full" type="submit" variant="destructive">Remove</Button>
							</form>
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		{/if}
	</PageTitle>

	<div class="grid items-end gap-2 md:flex">
		<ListNavbar {library} type="series" />
	</div>

	<Separator />

	{#if library.data.length}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each library.data as archive (archive.id)}
				<ListItem enableBookmark={!!data.user} gallery={archive} type="series" />
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
