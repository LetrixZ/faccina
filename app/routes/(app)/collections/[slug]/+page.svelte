<script lang="ts">
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash from 'lucide-svelte/icons/trash';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import ListItem from '$lib/components/list-item.svelte';
	import ListNavbar from '$lib/components/list-navbar.svelte';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	export let data;
	export let form;

	let deleteOpen = false;

	$: library = data.libraryPage;

	$: {
		if (form?.message && form.type === 'error') {
			toast.error(form.message);
		}
	}
</script>

<svelte:head>
	<title>{data.collection.name} • {data.site.name}</title>
</svelte:head>

<main class="container relative flex h-full flex-col gap-y-2">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<PageTitle>
			{data.collection.name} ({library.total})
		</PageTitle>

		<div class="flex gap-2">
			<Button
				class="flex size-8 gap-2 p-2"
				href="/collections/{data.collection.slug}/edit"
				title="Edit collection"
				variant="indigo"
			>
				<span class="sr-only"> Edit collection </span>
				<Pencil />
			</Button>

			{#if !data.collection.protected}
				<Dialog.Root onOpenChange={(open) => (deleteOpen = open)} open={deleteOpen}>
					<Dialog.Trigger>
						<Button class="flex size-8 gap-2 p-2" title="Remove collection" variant="destructive">
							<span class="sr-only"> Remove collection </span>
							<Trash />
						</Button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Are you sure you want to delete this collection?</Dialog.Title>
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
			{/if}
		</div>
	</div>

	<div class="grid items-end gap-2 md:flex">
		<ListNavbar {library} type="collection" />
	</div>

	<Separator />

	{#if library.archives.length}
		<div class="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
			{#each library.archives as archive (archive.id)}
				<ListItem gallery={archive} type="collection" />
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
