<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import Chip from '$lib/components/chip.svelte';
	import GallerySource from '$lib/components/gallery-source.svelte';
	import IconButton from '$lib/components/new/icon-button.svelte';
	import Button from '$lib/components/newnew/button.svelte';
	import { appState } from '$lib/state.svelte.js';
	import { apiUrl, cn, dateTimeFormat, getColor, humanFileSize, isSpread, isTag } from '$lib/utils';
	import {
		Bookmark,
		BookmarkCheck,
		BookmarkX,
		BookOpenText,
		Download,
		Heart,
		HeartOff,
	} from '@lucide/svelte';
	import Colums4 from '@lucide/svelte/icons/columns-4';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { generateFilename } from '~shared/utils';
	import type { Tag } from '$lib/types';
	import type { ClassValue } from 'svelte/elements';

	const previewLayouts = ['columns', 'grid'];
	type PreviewLayout = (typeof previewLayouts)[number];

	const { data } = $props();

	let previewLayout = $state<PreviewLayout>('columns');

	let coverElement: HTMLImageElement;

	const artists = $derived(
		data.gallery.tags.filter((tag) => tag.namespace === 'artist' || tag.namespace === 'author')
	);
	const circles = $derived(
		data.gallery.tags.filter((tag) => tag.namespace === 'circle' || tag.namespace === 'group')
	);
	const publishers = $derived(data.gallery.tags.filter((tag) => tag.namespace === 'publisher'));
	const magazines = $derived(data.gallery.tags.filter((tag) => tag.namespace === 'magazine'));
	const events = $derived(data.gallery.tags.filter((tag) => tag.namespace === 'event'));
	const parodies = $derived(data.gallery.tags.filter((tag) => tag.namespace === 'parody'));
	const tags = $derived(data.gallery.tags.filter(isTag));

	const pagesValue = $derived(data.gallery.pages === 1 ? `1 page` : `${data.gallery.pages} pages`);

	const setColor = () => appState.colors.set(data.gallery.id, getColor(coverElement));

	const toggleFavorite = async () => {
		const res = await fetch(`${apiUrl}/api/v1/user/toggle-favorite/${data.gallery.id}`, {
			method: 'POST',
		});

		if (res.ok) {
			invalidate('gallery:detail');
		} else {
			const { message } = await res.json();
			toast.error(message);
		}
	};

	let mounted = $state(false);

	$effect(() => {
		if (mounted) {
			localStorage.setItem('preview_layout', previewLayout);
		}
	});

	onMount(() => {
		const item = localStorage.getItem('preview_layout');
		if (item && previewLayouts.includes(item)) {
			previewLayout = item;
		}

		mounted = true;
	});
</script>

<svelte:head>
	<title>{data.gallery.title} • {data.site.name}</title>
</svelte:head>

{#snippet actionButtons()}
	<Button centered color="blue" icon={BookOpenText} iconSide="start">Start Reading</Button>
	<Button centered color="green" icon={Download} iconSide="start">Download</Button>

	{#if data.user}
		<div class="col-span-2 flex gap-2.5">
			<Button
				class="grow"
				centered
				color="red"
				icon={data.gallery.favorite ? HeartOff : Heart}
				iconClass={cn(data.gallery.favorite && 'fill-neutral-200')}
				iconSide="start"
				onclick={toggleFavorite}
			>
				{#if data.gallery.favorite}
					Remove from Favorites
				{:else}
					Add to favorites
				{/if}
			</Button>

			<Button color="orange" icon={Bookmark} />
		</div>
	{/if}
{/snippet}

<div class="flex flex-col gap-2">
	<div style="--color: rgba({appState.colors.get(data.gallery.id)});" class="flex rounded-lg">
		<div class="flex w-full flex-col gap-x-4 gap-y-1.5 md:flex-row">
			<div class="flex flex-col gap-2.5">
				<a href="/g/{data.gallery.id}/read/1{page.url.search}">
					<img
						bind:this={coverElement}
						class="aspect-[45/64] w-full rounded-sm object-contain shadow md:max-w-80 md:min-w-80"
						alt="'{data.gallery.title}' cover"
						crossorigin="anonymous"
						height={910}
						loading="eager"
						onload={setColor}
						src="{apiUrl}/image/{data.gallery.hash}/{data.gallery.thumbnail}?type=cover"
						width={640}
					/>
				</a>

				<div class="grid grid-cols-2 gap-2.5 max-md:hidden">
					{@render actionButtons()}
				</div>
			</div>

			<div class="flex flex-col gap-[0.1875rem] md:gap-1.5">
				<h1 class="text-2xl font-semibold md:text-4xl">
					{data.gallery.title}
				</h1>

				{#snippet sectionLabel(name: string)}
					<p class="flex min-h-5 w-16 shrink-0 items-center text-xs font-medium text-zinc-200">
						{name}
					</p>
				{/snippet}

				{#snippet tagSection(name: string, tags: Tag[], className?: ClassValue)}
					<div class={cn('flex items-start gap-2', className)}>
						{@render sectionLabel(name)}
						<div class="flex flex-wrap gap-1.5">
							{#each tags as tag, i (i)}
								<Chip {tag} />
							{/each}
						</div>
					</div>
				{/snippet}

				{#snippet infoSection(name: string, value: string | number, className?: ClassValue)}
					<div class={cn('flex items-start gap-2', className)}>
						{@render sectionLabel(name)}
						<p class="flex min-h-5 items-center text-xs font-semibold">{value}</p>
					</div>
				{/snippet}

				<div class="flex grow flex-col gap-1.5">
					{#if artists.length}
						{@render tagSection('Artists', artists)}
					{/if}

					{#if circles.length}
						{@render tagSection('Circles', circles)}
					{/if}

					{#if publishers.length}
						{@render tagSection('Publishers', publishers)}
					{/if}

					{#if magazines.length}
						{@render tagSection('Magazines', magazines)}
					{/if}

					{#if events.length}
						{@render tagSection('Events', events)}
					{/if}

					{#if parodies.length}
						{@render tagSection('Parodies', parodies)}
					{/if}

					{#if tags.length}
						{@render tagSection('Tags', tags)}
					{/if}

					{#if data.gallery.sources?.length}
						<div class={cn('flex items-start gap-2')}>
							{@render sectionLabel('Sources')}
							<div class="flex flex-wrap gap-1.5">
								{#each data.gallery.sources as source, i (i)}
									<GallerySource {source} />
								{/each}
							</div>
						</div>
					{/if}

					{@render infoSection('Length', pagesValue)}
					{@render infoSection('Size', humanFileSize(data.gallery.size))}
					{@render infoSection('Filename', generateFilename(data.gallery.title, data.gallery.tags))}

					{#if data.gallery.releasedAt}
						{@render infoSection('Released', dateTimeFormat(data.gallery.releasedAt))}
					{/if}

					{@render infoSection('Added', dateTimeFormat(data.gallery.createdAt))}

					<h5 class="max-w-4xl text-sm">
						{#if data.gallery.description?.length}
							{@render sectionLabel('Description')}
							<p class="font-medium">{data.gallery.description}</p>
						{:else}
							<i class=" text-zinc-400"> No description given</i>
						{/if}
					</h5>

					<div class="grid grid-cols-2 gap-2.5 md:hidden">
						{@render actionButtons()}
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="flex items-center gap-1.5">
		<p class="text-sm text-zinc-200">Previews</p>

		<IconButton
			class={['ms-auto p-0', previewLayout === 'columns' && 'active']}
			onclick={() => (previewLayout = 'columns')}
		>
			<Colums4 class="size-4.5" />
		</IconButton>

		<IconButton
			class={['p-0', previewLayout === 'grid' && 'active']}
			onclick={() => (previewLayout = 'grid')}
		>
			<LayoutGrid class="size-4.5" />
		</IconButton>
	</div>

	{#if previewLayout === 'columns'}
		<div
			class="-mx-1.5 scrollbar-thin flex gap-1.5 overflow-x-auto px-1.5 pb-1.5 scrollbar-thumb-zinc-500 scrollbar-track-transparent scrollbar-hover:scrollbar-thumb-zinc-400"
		>
			{#each data.gallery.images as image (image.pageNumber)}
				<a
					class="shrink-0 basis-[40%] md:basis-[25%] lg:basis-[17.5%] 2xl:basis-[15%]"
					href="/g/{data.gallery.id}/read/{image.pageNumber}{page.url.search}"
				>
					<img
						class={cn(
							'shadow-shadow aspect-[45/64] h-full w-full rounded-sm bg-zinc-800 object-contain shadow-md',
							isSpread(image) && 'object-contain'
						)}
						alt={`Thumbnail for page ${image.pageNumber}`}
						height={455}
						src="{apiUrl}/image/{data.gallery.hash}/{image.pageNumber}?type=thumb"
						width={320}
					/>
				</a>
			{/each}
		</div>
	{:else if previewLayout === 'grid'}
		<div
			class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8"
		>
			{#each data.gallery.images as image (image.pageNumber)}
				<a href="/g/{data.gallery.id}/read/{image.pageNumber}{page.url.search}">
					<img
						class={cn(
							'shadow-shadow aspect-[45/64] h-full w-full rounded-sm bg-zinc-800 object-contain shadow-md',
							isSpread(image) && 'object-contain'
						)}
						alt={`Thumbnail for page ${image.pageNumber}`}
						height={455}
						src="{apiUrl}/image/{data.gallery.hash}/{image.pageNumber}?type=thumb"
						width={320}
					/>
				</a>
			{/each}
		</div>
	{/if}
</div>
