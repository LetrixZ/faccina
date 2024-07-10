<script lang="ts">
	import ChipList from '$lib/components/chip-list.svelte';
	import { TagType, type ArchiveData } from '$lib/models';

	export let archive: ArchiveData;

	$: tags = [
		...(archive.artists ? archive.artists.map((tag) => ({ ...tag, type: TagType.ARTIST })) : []),
		...(archive.circles ? archive.circles.map((tag) => ({ ...tag, type: TagType.CIRCLE })) : []),
		...(archive.magazines
			? archive.magazines.map((tag) => ({ ...tag, type: TagType.MAGAZINE }))
			: []),
		...(archive.events ? archive.events.map((tag) => ({ ...tag, type: TagType.EVENT })) : []),
		...(archive.publishers
			? archive.publishers.map((tag) => ({ ...tag, type: TagType.PUBLISHER }))
			: []),
		...(archive.parodies ? archive.parodies.map((tag) => ({ ...tag, type: TagType.PARODY })) : []),
		...(archive.tags ? archive.tags.map((tag) => ({ ...tag, type: TagType.TAG })) : []),
	];
</script>

<div class="flex gap-2">
	<a href="#/g/{archive.id}">
		<div class="w-[160px] flex-shrink-0">
			<img
				class="h-full rounded-md bg-neutral-300 dark:bg-neutral-600"
				loading="lazy"
				alt={`'${archive.title}' cover`}
				src={`/image/${archive.key}/c`}
			/>
		</div>
	</a>

	<div class="space-y-2">
		<a href="#/g/{archive.id}">
			<p>
				<span class="my-auto text-sm font-medium text-muted-foreground"> [{archive.id}]</span>
				<span class="font-semibold">{archive.title}</span>
			</p>
		</a>

		<div class="flex flex-wrap gap-1.5">
			{#each tags as tag}
				<ChipList item={tag} type={tag.type} />
			{/each}
		</div>

		<div class="w-fit break-all rounded-md border-border bg-border p-2 text-sm font-medium">
			{archive.key}
		</div>

		<div class="w-fit break-all rounded-md border-border bg-border p-2 text-sm font-medium">
			{archive.path}
		</div>
	</div>
</div>
