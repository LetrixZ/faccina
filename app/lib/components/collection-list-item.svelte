<script lang="ts">
	import { appState } from '$lib/stores.svelte';
	import { cn } from '$lib/utils';
	import type { Collection } from '../types';
	import FileQuestion from '@lucide/svelte/icons/file-question';

	type Props = {
		collection: Collection;
	};

	let { collection }: Props = $props();

	const archives = $derived(collection.archives.slice(0, 3).reverse());

	const getStyle = (index: number) => {
		if (archives.length === 2) {
			if (index === 0) {
				return 'transform: translateX(-5px) translateY(-5px) rotate(0);';
			} else if (index === 1) {
				return 'transform: translateX(7.5px) translateY(7.5px) rotate(0);';
			}
		} else if (archives.length === 3) {
			switch (index) {
				case 0:
					return 'transform: translateX(-7.5px) translateY(-7.5px); transform-origin: 0;';
				case 1:
					return 'transform: translateX(0) translateY(2.5px); transform-origin: 0;';
				case 2:
					return 'transform: translateX(7.5px) translateY(15px); transform-origin: 0;';
			}
		}
	};
</script>

<a class="flex w-full flex-col items-center gap-4 rounded" href="/collections/{collection.slug}">
	<div class="flex aspect-[45/64] w-full">
		{#if archives.length}
			<div
				class={cn(
					'relative m-auto aspect-[45/64] w-full',
					archives.length === 2 && 'w-[95%]',
					archives.length === 3 && 'w-[90%]'
				)}
			>
				{#each archives as archive, i}
					<img
						alt="'{archive.title}' cover"
						class="absolute mb-2 aspect-[45/64] rounded shadow duration-150"
						height={910}
						loading="eager"
						src="{appState.siteConfig
							.imageServer}/image/{archive.hash}/{archive.thumbnail}?type=cover"
						style={getStyle(i)}
						width={640}
					/>
				{/each}
			</div>
		{:else}
			<div
				class="bg-secondary flex aspect-[46/64] h-full items-center justify-center rounded opacity-40 shadow-sm"
			>
				<FileQuestion class="size-12 text-white opacity-20" />
			</div>
		{/if}
	</div>

	<div class="text-center">
		<p class="line-clamp-2 font-semibold">
			{collection.name}
		</p>

		<p class="text-muted-foreground text-sm font-medium">
			{#if collection.archives.length}
				{@const count = collection.archives.length}
				{#if count === 1}
					{count} gallery
				{:else}
					{count} galleries
				{/if}
			{:else}
				0 galleries
			{/if}
		</p>
	</div>
</a>
