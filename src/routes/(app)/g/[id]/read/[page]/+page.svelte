<script lang="ts">
	import { goto, pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { ReadStat } from '$lib/types.js';
	import PagedReader from './PagedReader.svelte';
	import { reader, scalingOptions } from './reader.svelte.js';
	import Settings from './ReaderSettings.svelte';
	import Toolbar from './ReaderToolbar.svelte';
	import VerticalReader from './VerticalReader.svelte';
	import { onMount } from 'svelte';
	import { MetaTags } from 'svelte-meta-tags';

	let { data } = $props();

	let scrollContainer: HTMLDivElement | undefined = $state(undefined);

	let previewLayout = $state(false);
	let toolbarVisible = $state(true);
	let isMouted = $state(false);

	const readerAllowOriginal = $derived(data.readerAllowOriginal);

	const currentPage = $derived(page.state.page || parseInt(page.params.page!));
	const currentImage = $derived(data.gallery.images[currentPage - 1]!);

	const hasPrevious = $derived(currentPage > 1);
	const hasNext = $derived(currentPage < data.gallery.pages);

	const selectedPreset = $derived(
		data.presets.find((preset) => preset.hash === reader.current?.preset)
	);

	const selectedScaling = $derived(reader.current?.scaling ?? 'original');
	const selectedScalingOption = $derived(
		scalingOptions.find((option) => option.value === selectedScaling)!
	);

	const selectedTouchLayout = $derived(reader.current?.touchLayout ?? 'sides');
	const selectedTouchLayoutOption = $derived(
		reader.touchLayoutOptions.find((layout) => layout.name === selectedTouchLayout)!
	);

	const settingsOpen = $derived(page.state.settingsOpen === true);

	let scrollTo: ((page: number, skipNavigation?: boolean) => void) | undefined = $state(undefined);

	function gotoPage(pageNumber: number) {
		if (isMouted) {
			replaceState(`/g/${data.gallery.id}/read/${pageNumber}${page.url.search}`, {
				page: pageNumber
			});
		}
	}

	function onPage(pageNumber: number) {
		if (scrollTo) {
			scrollTo(pageNumber);
		} else {
			gotoPage(pageNumber);
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

	function stateReadPage(pageNumber: number) {
		if (!data.site.enableReadHistory || !data.user) {
			return;
		}

		fetch('/stats/read-page', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				pageNumber: pageNumber,
				isLastPage: data.gallery.pages === pageNumber,
				archiveId: data.gallery.id
			} satisfies ReadStat)
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

<svelte:window onkeydown={keydown} />

<MetaTags
	canonical={data.site.url}
	description={data.gallery.description ?? undefined}
	openGraph={{
		url: `${data.site.url}/g/${data.gallery.id}`,
		description: data.gallery.description ?? undefined,
		type: 'article',
		images: [{ url: `${data.site.url}/api/og/g/${data.gallery.id}` }],
		siteName: data.site.name
	}}
	title={`Page ${currentPage} - ${data.gallery.title}`}
	titleTemplate={`%s - ${data.site.name}`}
	twitter={{
		cardType: 'summary_large_image',
		description: data.gallery.description ?? undefined,
		image: `${data.site.url}/api/og/g/${data.gallery.id}`,
		title: `Page ${currentPage} - ${data.gallery.title} - ${data.site.name}`
	}}
/>

{#if reader.current?.readingMode === 'paged'}
	<PagedReader
		{currentPage}
		gallery={data.gallery}
		{hasNext}
		{hasPrevious}
		imageServer={data.site.imageServer}
		maxWidth={reader.current?.maxWidth ?? 0}
		minWidth={reader.current?.minWidth ?? 0}
		{onMenu}
		{onNext}
		{onPrevious}
		{previewLayout}
		{selectedPreset}
		{selectedScalingOption}
		{selectedTouchLayoutOption}
		toolbarPosition={reader.current?.toolbarPosition ?? 'bottom'}
	/>
{:else if reader.current?.readingMode === 'continuous-vertical'}
	<VerticalReader
		bind:scrollTo
		{currentPage}
		gallery={data.gallery}
		{gotoPage}
		{hasNext}
		{hasPrevious}
		imageServer={data.site.imageServer}
		maxWidth={reader.current?.maxWidth ?? 0}
		minWidth={reader.current?.minWidth ?? 0}
		{onMenu}
		{onNext}
		{onPrevious}
		{previewLayout}
		{selectedPreset}
		{selectedScaling}
		{selectedTouchLayoutOption}
		verticalGap={reader.current?.verticalGap ?? 0}
	/>
{/if}

<Toolbar
	{currentPage}
	onBack={() => goto(`/g/${data.gallery.id}${page.url.search}`)}
	onMenu={() => pushState('', { settingsOpen: true, page: page.state.page })}
	{onPage}
	pages={data.gallery.pages}
	position={reader.current?.toolbarPosition ?? 'bottom'}
	visible={toolbarVisible}
/>

<Settings
	bind:previewLayout
	{currentImage}
	{currentPage}
	gallery={data.gallery}
	imageServer={data.site.imageServer}
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
