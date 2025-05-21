<script lang="ts">
	import { page } from '$app/state';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import pixelWidth from 'string-pixel-width';
	import type { GalleryItem, SiteConfig, Tag } from '../types';
	import Chip from './chip.svelte';
	import { Button } from './ui/button';

	type Props = {
		gallery: GalleryItem;
		selected?: boolean;
		onSelect?: (gallery: GalleryItem) => void;
		siteConfig: SiteConfig;
	};

	let { gallery, selected = false, onSelect, siteConfig }: Props = $props();

	const { tags, moreCount } = $derived.by(() => {
		const maxWidth = 290;

		const tags = gallery.tags;

		let moreCount = tags.length;
		let width = 0;

		const reduced: Tag[] = [];

		for (const tag of tags) {
			if (reduced.find((t) => t.name === tag.name)) {
				continue;
			}

			if (tag.namespace === 'tag' && tag.name.length > 20) {
				continue;
			}

			if (width < maxWidth) {
				const tagWidth = 12 + pixelWidth(tag.name, { font: 'inter', size: 12 });

				width += tagWidth;
				reduced.push(tag);
				moreCount--;
			}
		}

		return { tags: reduced, moreCount };
	});
</script>

<div class="group h-auto w-auto space-y-2">
	<a
		href="/g/{gallery.id}{page.url.search}"
		onclick={(ev) => {
			ev.preventDefault();
			onSelect?.(gallery);
		}}
	>
		<div class="relative overflow-clip rounded-md shadow">
			<img
				class="aspect-[45/64] bg-neutral-800 object-contain"
				alt="'{gallery.title}' cover"
				height={910}
				loading="eager"
				src="{siteConfig.imageServer}/image/{gallery.hash}/{gallery.thumbnail}?type=cover"
				width={640}
			/>

			<div class="absolute top-1 right-1">
				{#if selected}
					<CircleCheck class="fill-secondary-foreground/90 size-7 rounded-full text-indigo-700" />
				{/if}
			</div>

			<div class="absolute end-1 bottom-1 flex gap-1">
				{#if gallery.deletedAt}
					<div
						class="flex aspect-square size-6 items-center justify-center rounded-md bg-slate-700 p-1 text-xs font-bold text-white opacity-85"
					>
						<EyeOff class="size-3.5" />
					</div>
				{/if}
				<div class="w-fit rounded-md bg-neutral-900 p-1 text-xs font-bold text-white opacity-70">
					{gallery.pages}P
				</div>
			</div>
		</div>
	</a>

	<div class="h-fit space-y-1.5">
		<a
			class="focus-visible:text-foreground group-hover:text-foreground line-clamp-2 pe-2 leading-6 font-medium underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
			href="/g/{gallery.id}{page.url.search}"
			target="_blank"
			title={gallery.title}
		>
			{gallery.title}
		</a>

		<div class="flex flex-wrap gap-1.5">
			{#each tags as tag}
				<Chip newTab {tag} />
			{/each}

			{#if moreCount}
				<Button
					class="h-6 w-fit px-1.5 py-0 text-xs font-semibold text-neutral-50 dark:text-neutral-200"
					variant="secondary"
				>
					+ {moreCount}
				</Button>
			{/if}
		</div>
	</div>
</div>
