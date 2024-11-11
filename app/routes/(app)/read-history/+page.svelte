<script lang="ts">
	import ListItemHistory from '$lib/components/list-item-history.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import type { HistoryEntry } from '$lib/types';
	import { relativeDate } from '$lib/utils';

	export let data;

	$: groupedEntries = data.entries.reduce(
		(acc, entry) => {
			const dateKey = relativeDate(entry.lastReadAt);

			if (!acc[dateKey]) {
				acc[dateKey] = [];
			}

			acc[dateKey].push(entry);

			return acc;
		},
		{} as { [key: string]: HistoryEntry[] }
	);
</script>

<main class="container flex flex-auto flex-col gap-y-2">
	<PageTitle>Read history</PageTitle>

	<Separator />

	{#if Object.keys(groupedEntries).length}
		<div class="grid gap-2">
			{#each Object.keys(groupedEntries) as group}
				<div class="flex flex-col gap-2">
					<p class="font-medium">{group}</p>

					<div
						aria-label="Collection"
						class="relative grid gap-2 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4"
					>
						{#each groupedEntries[group] as entry}
							<div>
								<ListItemHistory {entry} />
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex flex-auto flex-col items-center justify-center gap-4">
			<h3 class="text-2xl font-medium">You haven't read anything yet</h3>
			<Button href="/" variant="outline">Browse galleries</Button>
		</div>
	{/if}
</main>
