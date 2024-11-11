<script lang="ts">
	import CollectionListItem from '$lib/components/collection-list-item.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';

	export let data;
</script>

<main class="container flex flex-auto flex-col space-y-2">
	<div class="flex w-full items-center justify-between gap-4">
		<PageTitle>Collections</PageTitle>
		<Button class="h-fit py-1" href="collections/new" variant="link">
			Create a new collection
		</Button>
	</div>

	<Separator />

	{#if data.collections.length}
		<div
			class="grid w-full grid-cols-2 gap-4 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-7"
		>
			{#each data.collections as collection (collection.id)}
				<CollectionListItem {collection} />
			{/each}
		</div>
	{:else}
		<div class="flex flex-auto flex-col items-center justify-center gap-4">
			<h3 class="text-2xl font-medium">No collections found</h3>
			<Button href="/collections/new" variant="outline">Create a collection</Button>
		</div>
	{/if}
</main>
