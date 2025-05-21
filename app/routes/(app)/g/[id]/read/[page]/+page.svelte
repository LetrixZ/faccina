<script lang="ts">
	import { goto, pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import { onMount } from 'svelte';
	import { MetaTags } from 'svelte-meta-tags';
	import PagedReader from './PagedReader.svelte';
	import { getTouchLayoutOptions, readerState, scalingOptions } from './reader.svelte.js';
	import Settings from './ReaderSettings.svelte';
	import Toolbar from './ReaderToolbar.svelte';
	import VerticalReader from './VerticalReader.svelte';
	import type { ReadStat } from '$lib/types';

	const { data } = $props();

	let scrollContainer: HTMLDivElement | undefined;

	let previewLayout = $state(false);
	let toolbarVisible = $state(true);
	let isMouted = $state(false);

	const readerAllowOriginal = $derived(data.readerAllowOriginal);

	const currentPage = $derived(page.state.page || parseInt(page.params.page!));
	const currentImage = $derived(data.gallery.images[currentPage - 1]!);

	const hasPrevious = $derived(currentPage > 1);
	const hasNext = $derived(currentPage < data.gallery.pages);

	const selectedPreset = $derived(
		data.presets.find((preset) => preset.hash === readerState.preset)
	);

	const selectedScaling = $derived(readerState.scaling!);
	const selectedScalingOption = $derived(
		scalingOptions.find((option) => option.value === selectedScaling)!
	);

	const touchLayoutOptions = getTouchLayoutOptions();

	const selectedTouchLayout = $derived(readerState.touchLayout);
	const selectedTouchLayoutOption = $derived(
		touchLayoutOptions.find((layout) => layout.name === selectedTouchLayout)!
	);

	const settingsOpen = $derived(page.state.settingsOpen === true);

	// svelte-ignore non_reactive_update
	let verticalReader: VerticalReader | undefined;

	function gotoPage(pageNumber: number) {
		if (isMouted) {
			replaceState(`/g/${data.gallery.id}/read/${pageNumber}${page.url.search}`, {
				page: pageNumber,
			});
		}
	}

	function onPage(page: number) {
		if (verticalReader) {
			verticalReader.scrollTo(page);
		} else {
			gotoPage(page);
		}
	}

	function onPrevious() {
		if (!hasPrevious) {
			return;
		}

		toolbarVisible = false;
		onPage(currentPage - 1);
	}

	function onNext() {
		if (!hasNext) {
			return;
		}

		toolbarVisible = false;
		onPage(currentPage + 1);
	}

	function onMenu(value?: boolean) {
		if (value !== undefined) {
			toolbarVisible = value;
		} else {
			toolbarVisible = !toolbarVisible;
		}
	}

	function stateReadPage(page: number) {
		if (!data.site.enableReadHistory || !data.user) {
			return;
		}

		fetch('/stats/read-page', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				pageNumber: page,
				isLastPage: data.gallery.pages === page,
				archiveId: data.gallery.id,
			} satisfies ReadStat),
		});
	}

	function keydown(event: KeyboardEvent) {
		if (settingsOpen) {
			return;
		}

		switch (event.key) {
			case 'Escape':
				toolbarVisible = !toolbarVisible;
				break;
			case 'Backspace':
				history.back();
				break;
			case 'ArrowRight':
				if (hasNext) {
					if (event.shiftKey) {
						onPage(data.gallery.pages);
					} else {
						onPage(currentPage + 1);
					}
				}
				break;
			case 'ArrowLeft':
				if (hasPrevious) {
					if (event.shiftKey) {
						onPage(1);
					} else {
						onPage(currentPage - 1);
					}
				}
				break;
		}
	}

	onMount(() => {
		isMouted = true;
	});

	$effect(() => {
		stateReadPage(currentPage);
	});
</script>

<svelte:head>
	<title>Page {currentPage} • {data.gallery.title} • {data.site.name}</title>
</svelte:head>

<svelte:window on:keydown={keydown} />

<MetaTags
	canonical={data.site.url}
	description={data.gallery.description ?? undefined}
	openGraph={{
		url: `${data.site.url}/g/${data.gallery.id}`,
		description: data.gallery.description ?? undefined,
		type: 'article',
		images: [{ url: `${data.site.url}/api/og/g/${data.gallery.id}` }],
		siteName: data.site.name,
	}}
	title={`Page ${currentPage} - ${data.gallery.title}`}
	titleTemplate={`%s - ${data.site.name}`}
	twitter={{
		cardType: 'summary_large_image',
		description: data.gallery.description ?? undefined,
		image: `${data.site.url}/api/og/g/${data.gallery.id}`,
		title: `Page ${currentPage} - ${data.gallery.title} - ${data.site.name}`,
	}}
/>

{#if readerState.readingMode === 'paged'}
	<PagedReader
		{currentPage}
		gallery={data.gallery}
		{hasNext}
		{hasPrevious}
		maxWidth={readerState.maxWidth!}
		minWidth={readerState.minWidth!}
		{onMenu}
		{onNext}
		{onPrevious}
		{previewLayout}
		{selectedPreset}
		{selectedScalingOption}
		{selectedTouchLayoutOption}
		toolbarPosition={readerState.toolbarPosition!}
	/>
{:else if readerState.readingMode === 'continuous-vertical'}
	<VerticalReader
		bind:this={verticalReader}
		{currentPage}
		gallery={data.gallery}
		{gotoPage}
		{hasNext}
		{hasPrevious}
		maxWidth={readerState.maxWidth!}
		minWidth={readerState.minWidth!}
		{onMenu}
		{onNext}
		{onPrevious}
		{previewLayout}
		{selectedPreset}
		{selectedScaling}
		{selectedTouchLayoutOption}
		verticalGap={readerState.verticalGap!}
	/>
{/if}

<Toolbar
	{currentPage}
	onBack={() => goto(`/g/${data.gallery.id}${page.url.search}`)}
	onMenu={() => pushState('', { settingsOpen: true, page: page.state.page })}
	{onPage}
	pages={data.gallery.pages}
	position={readerState.toolbarPosition!}
	visible={toolbarVisible}
/>

<Settings
	{currentImage}
	{currentPage}
	gallery={data.gallery}
	onOpenChange={(open) => {
		if (!open) {
			history.back();
		}
	}}
	open={settingsOpen}
	presets={data.presets}
	{readerAllowOriginal}
	{scrollContainer}
	{selectedPreset}
	bind:previewLayout
/>

<noscript>
	<div
		class="absolute inset-0 m-auto flex h-fit w-fit flex-col items-center justify-center gap-4 p-4"
	>
		<p class="text-center text-3xl font-medium">JavaScript is required for the reader</p>

		<Button
			class="mb-4 h-12 w-full text-lg"
			data-sveltekit-preload-data="off"
			href="/g/{data.gallery.id}"
			variant="outline"
		>
			Go back
		</Button>
	</div>
</noscript>
