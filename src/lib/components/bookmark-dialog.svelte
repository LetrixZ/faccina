<script lang="ts">
	import { enhance } from '$app/forms';
	import { appState } from '$lib/app.svelte';
	import type { Gallery } from '$lib/types.js';
	import { Button } from './ui/button/index.js';

	let { gallery }: { gallery: Pick<Gallery, 'id'> } = $props();
</script>

{#if appState.collections?.length}
	<ul class="grid gap-2">
		{#each appState.collections as collection (collection.id)}
			{@const archives = collection.archives}
			<li class="flex items-center justify-between">
				<div class="flex gap-2">
					•
					<div class="flex flex-col">
						<a class="text-lg font-medium" href="/collections/{collection.slug}" target="_blank">
							{collection.name}
						</a>
						<span class="text-sm text-muted-foreground">
							{#if archives.length === 1}
								1 gallery
							{:else if !archives.length}
								No galleries
							{:else}
								{archives.length} galleries
							{/if}
						</span>
					</div>
				</div>

				{#if archives.some(({ id }) => id === gallery.id)}
					<form action="/g/{gallery.id}/?/removeCollection" method="POST" use:enhance>
						<input class="hidden" name="collection" value={collection.id} />
						<input class="hidden" name="archive" value={gallery.id} />
						<Button class="ms-auto" size="sm" type="submit" variant="destructive">Remove</Button>
					</form>
				{:else}
					<form action="/g/{gallery.id}/?/addCollection" method="POST" use:enhance>
						<input class="hidden" name="collection" value={collection.id} />
						<input class="hidden" name="archive" value={gallery.id} />
						<Button class="ms-auto" size="sm" type="submit" variant="indigo">Add</Button>
					</form>
				{/if}
			</li>
		{/each}
	</ul>

	<Button href="/collections/new" variant="link">Create a collection</Button>
{:else}
	<div class="flex flex-auto flex-col items-center justify-center gap-4 py-12">
		<h3 class="text-2xl font-medium">No collections found</h3>
		<Button href="/collections/new" variant="outline">Create a collection</Button>
	</div>
{/if}
