<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Separator } from '$lib/components/ui/separator';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import {
		currentArchive,
		nextPage,
		preferencesOpen,
		prefs,
		prevPage,
		previewLayout,
		readerPage,
		readerTimeout,
		showBar,
	} from '$lib/reader-store';
	import { cn, remToPx, type BarPlacement } from '$lib/utils';
	import cookie from 'cookie';
	import dayjs from 'dayjs';
	import { ArrowLeft, MenuIcon } from 'lucide-svelte';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { ImageSize, TouchLayout } from '../models';

	$: currentPage = $page.state.page || parseInt($page.params.page!);
	$: total = $currentArchive ? $currentArchive.images.length : 0;

	$: prevPageUrl = $prevPage ? `${$prevPage}${$page.url.search}` : undefined;
	$: nextPageUrl = $nextPage ? `${$nextPage}${$page.url.search}` : undefined;

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
		in:fly={{
			duration: 150,
			y: $prefs.barPlacement === 'bottom' ? '3rem' : '-3rem',
			opacity: 1,
		}}
		out:fly={{
			duration: 150,
			y: $prefs.barPlacement === 'bottom' ? '3rem' : '-3rem',
			opacity: 1,
		}}
		class={cn(
			'fixed inset-x-0 z-10 overflow-clip',
			$prefs.barPlacement === 'bottom' ? 'bottom-0' : 'top-0'
		)}
		on:click={() => readerTimeout.reset()}
		on:mousemove={() => readerTimeout.reset()}
	>
		<div class="relative mx-auto flex h-12 w-full items-center justify-between bg-background px-2">
			<a
				href={`/g/${$page.params.id}${$page.url.search}`}
				draggable="false"
				class="inline-flex h-full items-center justify-center p-0 text-sm font-medium text-muted-foreground-light underline-offset-4 hover:underline"
			>
				<ArrowLeft class="size-5" />
				<span class="sr-only">Go back</span>
			</a>

			<div class="absolute inset-0 mx-auto flex w-fit items-center">
				<a
					href={prevPageUrl}
					on:click|preventDefault={() => ($readerPage = $prevPage)}
					draggable="false"
					class={cn(
						'inline-flex h-full items-center justify-center px-8 py-0 text-sm font-medium text-muted-foreground-light underline-offset-4 hover:underline',
						!$prevPage && 'pointer-events-none opacity-40'
					)}
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
						{#each new Array(total).fill(0).map((_, i) => i + 1) as pageNumber}
							<option value={pageNumber} selected={currentPage === pageNumber}>
								{pageNumber}
							</option>
						{/each}

						<span> {currentPage}</span> /
						<span>{total}</span>
					</select>

					<Button
						variant="link"
						class="w-full whitespace-pre font-medium underline-offset-4"
						on:click={() => pageSelect.showPicker()}
					>
						<span>{currentPage}</span>&ThickSpace;/&ThickSpace;<span>
							{total}
						</span>
					</Button>
				</div>

				<a
					href={nextPageUrl}
					on:click|preventDefault={() => ($readerPage = $nextPage)}
					draggable="false"
					class={cn(
						'inline-flex h-full items-center justify-center px-8 py-0 text-sm font-medium text-muted-foreground-light underline-offset-4 hover:underline ',
						!$nextPage && 'pointer-events-none opacity-40'
					)}
				>
					<ChevronRight class="ms-2" />
					<span class="sr-only">Next page</span>
				</a>
			</div>

			<Button
				draggable="false"
				variant="link"
				class="inline-flex h-full items-center justify-center p-0 text-sm font-medium text-muted-foreground-light underline-offset-4 hover:underline"
				on:click={() => ($preferencesOpen = true)}
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
		<RadioGroup.Root value={$prefs.barPlacement} onValueChange={onPlacemenetChange}>
			<div class="flex items-center space-x-2">
				<RadioGroup.Item value="top" id="top" />
				<Label for="top">Top</Label>
			</div>
			<div class="flex items-center space-x-2">
				<RadioGroup.Item value="bottom" id="bottom" />
				<Label for="bottom">Bottom</Label>
			</div>
		</RadioGroup.Root>

		<h3 class="text-lg font-medium">Touch layout</h3>

		<ToggleGroup.Root
			id="fit-mode"
			variant="outline"
			type="single"
			value={$prefs.touchLayout}
			onValueChange={onLayoutChange}
			class="flex flex-wrap"
		>
			<ToggleGroup.Item value={TouchLayout.LeftToRight}>Left to Right</ToggleGroup.Item>
			<ToggleGroup.Item value={TouchLayout.RightToLeft}>Right to Left</ToggleGroup.Item>
		</ToggleGroup.Root>

		<div class="flex items-center">
			<Label for="preview-layout" class="w-full">Preview touch layout</Label>
			<Checkbox id="preview-layout" bind:checked={$previewLayout} />
		</div>

		<Separator />

		<h3 class="text-lg font-medium">Image scaling</h3>

		<ToggleGroup.Root
			id="fit-mode"
			variant="outline"
			type="single"
			value={$prefs.imageSize}
			onValueChange={onModeChange}
			class="flex flex-wrap"
		>
			<ToggleGroup.Item value={ImageSize.Original}>Original</ToggleGroup.Item>
			<ToggleGroup.Item value={ImageSize.FillWidth}>Fill Width</ToggleGroup.Item>
			<ToggleGroup.Item value={ImageSize.FillHeight}>Fill Height</ToggleGroup.Item>
		</ToggleGroup.Root>

		<div class="flex items-center">
			<Label for="min-width" class="w-full">Min width</Label>
			<Input
				id="min-width"
				type="number"
				value={$prefs.minWidth}
				class="w-24"
				on:change={(event) =>
					($prefs.minWidth = event.currentTarget.value.length
						? parseInt(event.currentTarget.value)
						: undefined)}
			/>
		</div>

		<div class="flex items-center">
			<Label for="max-width" class="w-full">Max width</Label>
			<Input
				id="max-width"
				type="number"
				value={$prefs.maxWidth}
				class="w-24"
				on:change={(event) =>
					($prefs.maxWidth = event.currentTarget.value.length
						? parseInt(event.currentTarget.value)
						: undefined)}
			/>
		</div>
	</Dialog.Content>
</Dialog.Root>
