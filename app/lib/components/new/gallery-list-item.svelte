<script lang="ts">
	import { page } from '$app/state';
	import { appState } from '$lib/state.svelte';
	import { apiUrl, getColor, getDisplayTags } from '$lib/utils';
	import Chip from '../chip.svelte';
	import type { GalleryItem, Tag } from '$lib/types';

	type Props = {
		gallery: GalleryItem;
	};

	let { gallery }: Props = $props();

	let infoContainer: HTMLDivElement;

	let maxLines = $state(2);
	let clientWidth = $state(0);
	let titleHeight = $state(0);

	let dominantColor = $derived(appState.colors.get(gallery.id));
	let coverElement: HTMLImageElement;

	let filteredTags = $state<Tag[]>([]);

	const moreCount = $derived(gallery.tags.length - filteredTags.length);

	$effect(() => {
		if (clientWidth) {
			filteredTags = getDisplayTags(infoContainer, gallery.tags, maxLines);
			setTimeout(() => (filteredTags = getDisplayTags(infoContainer, gallery.tags, maxLines)));
		}
	});

	const style = $derived(dominantColor ? `--color-accent: ${dominantColor}` : undefined);

	export function getMaxLines() {
		return maxLines;
	}

	export function setMaxLines(max: number) {
		maxLines = max;
	}

	export { titleHeight, maxLines };
</script>

<div {style} class="card relative duration-300">
	<div bind:this={infoContainer} class="z-10 flex flex-col" bind:clientWidth>
		<a class="peer" href="/g/{gallery.id}{page.url.search}">
			<img
				bind:this={coverElement}
				class="aspect-[45/64] rounded object-contain"
				alt="'{gallery.title}' cover"
				crossorigin="anonymous"
				height={910}
				loading="eager"
				onload={() => appState.colors.set(gallery.id, getColor(coverElement))}
				src="{apiUrl}/image/{gallery.hash}/{gallery.thumbnail}?type=cover"
				width={640}
			/>
		</a>

		<div class="title overflow-hidden px-0.5 py-1.5">
			<a
				class="line-clamp-2 font-semibold"
				href="/g/{gallery.id}{page.url.search}"
				title={gallery.title}
			>
				<p class="w-fit leading-snug duration-200" bind:clientHeight={titleHeight}>
					{gallery.title}
				</p>
			</a>
		</div>

		<div class="flex flex-wrap gap-1">
			{#each filteredTags as tag (tag.name)}
				<Chip {tag} />
			{/each}

			{#if moreCount}
				<div class="more-count flex rounded-2xl px-2 py-1 text-xs leading-3 font-semibold">
					+ {moreCount}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.card {
		img {
			transition: filter 200ms;
			filter: drop-shadow(0 0 5px --alpha(var(--color-accent) / 25%));
		}

		&:hover {
			img {
				filter: drop-shadow(0 0 7.5px --alpha(var(--color-accent) / 35%));
			}
		}
	}

	/* https://stackoverflow.com/a/62872785/6785387 */
	.title {
		p {
			background: linear-gradient(currentColor 0 0) bottom left / var(--underline-width, 0%)
				0.075rem no-repeat;
		}

		&:is(:where(:global(.peer)):hover ~ *),
		&:hover {
			p {
				--underline-width: 100%;
			}
		}
	}

	.more-count {
		background-color: color-mix(in oklab, var(--color-zinc-800) 80%, var(--color-accent));
	}
</style>
