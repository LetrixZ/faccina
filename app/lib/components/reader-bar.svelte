<!-- @migration-task Error while migrating Svelte code: `<span>` is invalid inside `<select>` -->
<script lang="ts">
	import cookie from 'cookie';
	import dayjs from 'dayjs';
	import { ArrowLeft, MenuIcon } from 'lucide-svelte';
	import ChevronFirst from 'lucide-svelte/icons/chevron-first';
	import ChevronLast from 'lucide-svelte/icons/chevron-last';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { ImageSize, TouchLayout } from '../models';
	import type { Gallery } from '../types';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Separator } from '$lib/components/ui/separator';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index';
	import {
		nextPage,
		preferencesOpen,
		prefs,
		previewLayout,
		prevPage,
		readerPage,
		readerTimeout,
		showBar,
	} from '$lib/reader-store';
	import { type BarPlacement, cn, remToPx } from '$lib/utils';

	export let gallery: Gallery;

	$: currentPage = $page.state.page || parseInt($page.params.page);
	$: validPage = !isNaN(currentPage) && currentPage > 0 && gallery.images.length >= currentPage;
	$: total = gallery.images.length;

	$: prevPageUrl = $prevPage ? `${$prevPage}${$page.url.search}` : undefined;
	$: nextPageUrl = $nextPage ? `${$nextPage}${$page.url.search}` : undefined;

	$: firstPageUrl = `1${$page.url.search}`;
	$: lastPageUrl = `${total}${$page.url.search}`;

	let pageSelect: HTMLSelectElement;

	const onPlacemenetChange = (placement: string) => {
		$prefs.barPlacement = placement as BarPlacement;
	};

	const onModeChange = (mode: string | undefined) => {
		$prefs.imageSize = (mode ?? ImageSize.Original) as ImageSize;
	};

	const onLayoutChange = (mode: string | undefined) => {
		$prefs.touchLayout = (mode ?? TouchLayout.LeftToRight) as TouchLayout;
	};

	$: {
		if ($showBar) {
			readerTimeout.reset();
		}
	}

	$: {
		if ($preferencesOpen) {
			$showBar = true;
			readerTimeout.clear();
		} else {
			readerTimeout.reset();
		}
	}

	let isMounted = true;

	onMount(() => {
		isMounted = true;
	});

	$: {
		if (browser && isMounted) {
			document.cookie = cookie.serialize('reader', JSON.stringify($prefs), {
				path: '/',
				maxAge: dayjs().add(1, 'year').diff(dayjs(), 'seconds'),
			});
		}
	}
</script>

<svelte:window
	on:mousemove={(ev) => {
		if ($prefs.barPlacement === 'bottom' && window.innerHeight - ev.clientY <= remToPx(4)) {
			$showBar = true;
			readerTimeout.reset();
		} else if (
			$prefs.barPlacement === 'top' &&
			window.innerHeight + ev.clientY - window.innerHeight <= remToPx(4)
		) {
			$showBar = true;
			readerTimeout.reset();
		}
	}}
/>

{#if $showBar}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class={cn(
			'fixed inset-x-0 z-10 overflow-clip',
			$prefs.barPlacement === 'bottom' ? 'bottom-0' : 'top-0'
		)}
		in:fly={{
			duration: 150,
			y: $prefs.barPlacement === 'bottom' ? '3rem' : '-3rem',
			opacity: 1,
		}}
		on:click={() => readerTimeout.reset()}
		on:mousemove={() => readerTimeout.reset()}
		out:fly={{
			duration: 150,
			y: $prefs.barPlacement === 'bottom' ? '3rem' : '-3rem',
			opacity: 1,
		}}
	>
		<div class="relative mx-auto flex h-12 w-full items-center justify-between bg-background px-2">
			<a
				class="inline-flex h-full items-center justify-center p-0 text-sm font-medium text-muted-foreground-light underline-offset-4 hover:underline"
				draggable="false"
				href={`/g/${$page.params.id}${$page.url.search}`}
			>
				<ArrowLeft class="size-5" />
				<span class="sr-only">Go back</span>
			</a>

			<div class="absolute inset-0 mx-auto flex w-fit items-center">
				<a
					class={cn(
						'inline-flex h-full items-center justify-center px-2 py-0 text-sm font-medium text-muted-foreground-light underline-offset-4 hover:underline xs:px-8',
						currentPage === 1 && 'pointer-events-none opacity-40'
					)}
					draggable="false"
					href={firstPageUrl}
					on:click|preventDefault={() => ($readerPage = 1)}
				>
					<ChevronFirst class="ms-2" />
					<span class="sr-only">First page</span>
				</a>

				<a
					class={cn(
						'inline-flex h-full items-center justify-center px-2 py-0 text-sm font-medium text-muted-foreground-light underline-offset-4 hover:underline xs:px-8',
						!$prevPage && 'pointer-events-none opacity-40'
					)}
					draggable="false"
					href={prevPageUrl}
					on:click|preventDefault={() => ($readerPage = $prevPage)}
				>
					<ChevronLeft class="me-2" />
					<span class="sr-only">Previous page</span>
				</a>

				<div class="relative w-20 sm:w-24">
					<select
						bind:this={pageSelect}
						class="absolute inset-0 -z-10 mx-auto w-fit opacity-0"
						name="page"
						on:change={(ev) => ($readerPage = parseInt(ev.currentTarget.value))}
					>
						{#if !validPage}
							<option></option>
						{/if}
						{#each new Array(total).fill(0).map((_, i) => i + 1) as pageNumber}
							<option selected={currentPage === pageNumber} value={pageNumber}>
								{pageNumber}
							</option>
						{/each}

						<span> {currentPage}</span> /
						<span>{total}</span>
					</select>

					<Button
						class="w-full whitespace-pre font-medium underline-offset-4"
						on:click={() => pageSelect.showPicker()}
						variant="link"
					>
						{#if validPage}
							<span>{currentPage}</span>&ThickSpace;/&ThickSpace;<span>{total}</span>
						{:else}
							<span>-</span>&ThickSpace;/&ThickSpace;<span>{total}</span>
						{/if}
					</Button>
				</div>

				<a
					class={cn(
						'inline-flex h-full items-center justify-center px-2 py-0 text-sm font-medium text-muted-foreground-light underline-offset-4 hover:underline xs:px-8 ',
						!$nextPage && 'pointer-events-none opacity-40'
					)}
					draggable="false"
					href={nextPageUrl}
					on:click|preventDefault={() => ($readerPage = $nextPage)}
				>
					<ChevronRight class="ms-2" />
					<span class="sr-only">Next page</span>
				</a>

				<a
					class={cn(
						'inline-flex h-full items-center justify-center px-2 py-0 text-sm font-medium text-muted-foreground-light underline-offset-4 hover:underline xs:px-8',
						currentPage >= total && 'pointer-events-none opacity-40'
					)}
					draggable="false"
					href={lastPageUrl}
					on:click|preventDefault={() => ($readerPage = total)}
				>
					<ChevronLast class="ms-2" />
					<span class="sr-only">Last page</span>
				</a>
			</div>

			<Button
				class="inline-flex h-full items-center justify-center p-0 text-sm font-medium text-muted-foreground-light underline-offset-4 hover:underline"
				draggable="false"
				on:click={() => ($preferencesOpen = true)}
				variant="link"
			>
				<MenuIcon class="size-5" />
				<span class="sr-only">Open reader preferences</span>
			</Button>
		</div>
	</div>
{/if}

<Dialog.Root bind:open={$preferencesOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Reader preferences</Dialog.Title>
		</Dialog.Header>

		<p class="text-sm font-medium leading-none text-muted-foreground-light">
			Control bar placement
		</p>
		<RadioGroup.Root onValueChange={onPlacemenetChange} value={$prefs.barPlacement}>
			<div class="flex items-center space-x-2">
				<RadioGroup.Item id="top" value="top" />
				<Label for="top">Top</Label>
			</div>
			<div class="flex items-center space-x-2">
				<RadioGroup.Item id="bottom" value="bottom" />
				<Label for="bottom">Bottom</Label>
			</div>
		</RadioGroup.Root>

		<h3 class="text-lg font-medium">Touch layout</h3>

		<ToggleGroup.Root
			class="flex flex-wrap"
			id="fit-mode"
			onValueChange={onLayoutChange}
			type="single"
			value={$prefs.touchLayout}
			variant="outline"
		>
			<ToggleGroup.Item value={TouchLayout.LeftToRight}>Left to Right</ToggleGroup.Item>
			<ToggleGroup.Item value={TouchLayout.RightToLeft}>Right to Left</ToggleGroup.Item>
		</ToggleGroup.Root>

		<div class="flex items-center">
			<Label class="w-full" for="preview-layout">Preview touch layout</Label>
			<Checkbox bind:checked={$previewLayout} id="preview-layout" />
		</div>

		<Separator />

		<h3 class="text-lg font-medium">Image scaling</h3>

		<ToggleGroup.Root
			class="flex flex-wrap"
			id="fit-mode"
			onValueChange={onModeChange}
			type="single"
			value={$prefs.imageSize}
			variant="outline"
		>
			<ToggleGroup.Item value={ImageSize.Original}>Original</ToggleGroup.Item>
			<ToggleGroup.Item value={ImageSize.FillWidth}>Fill Width</ToggleGroup.Item>
			<ToggleGroup.Item value={ImageSize.FillHeight}>Fill Height</ToggleGroup.Item>
		</ToggleGroup.Root>

		<div class="flex items-center">
			<Label class="w-full" for="min-width">Min width</Label>
			<Input
				class="w-24"
				id="min-width"
				min="1"
				on:change={(event) =>
					($prefs.minWidth = event.currentTarget.value.length
						? parseInt(event.currentTarget.value)
						: undefined)}
				type="number"
				value={$prefs.minWidth}
			/>
		</div>

		<div class="flex items-center">
			<Label class="w-full" for="max-width">Max width</Label>
			<Input
				class="w-24"
				id="max-width"
				min="1"
				on:change={(event) =>
					($prefs.maxWidth = event.currentTarget.value.length
						? parseInt(event.currentTarget.value)
						: undefined)}
				type="number"
				value={$prefs.maxWidth}
			/>
		</div>
	</Dialog.Content>
</Dialog.Root>
