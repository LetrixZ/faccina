<script lang="ts">
	import ListItemHistory from '$lib/components/list-item-history.svelte';
	import PageTitle from '$lib/components/page-title.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { relativeDate } from '$lib/utils';
	import type { HistoryEntry } from '$lib/types';

	const { data } = $props();

	const groupedEntries = $derived(
		data.entries.reduce(
			(acc, entry) => {
				const date = relativeDate(entry.lastReadAt);

				let dateEntry = acc.find((entry) => entry.date === date);

				if (!dateEntry) {
					dateEntry = { date, entries: [] };
					acc.push(dateEntry);
				}

				dateEntry.entries.push(entry);

				return acc;
			},
			[] as { date: string; entries: HistoryEntry[] }[]
		)
	);
</script>

<main class="container flex flex-auto flex-col gap-y-2">
	<PageTitle>Read history</PageTitle>

	<Separator />

	{#if groupedEntries.length}
		<div class="grid gap-2">
			{#each groupedEntries as group}
				<div class="flex flex-col gap-2">
					<p class="font-medium">{group.date}</p>

					<div
						class="3xl:grid-cols-4 relative grid gap-2 md:grid-cols-2 xl:grid-cols-3"
						aria-label="Collection"
					>
						{#each group.entries as entry}
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
