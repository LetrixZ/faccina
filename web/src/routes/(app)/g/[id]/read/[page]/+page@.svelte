<script lang="ts">
	import { browser } from '$app/environment';
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Separator } from '$lib/components/ui/separator';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { ImageFitMode, type Image } from '$lib/models';
	import { cn, remToPx, type BarPlacement, type ReaderPreferences } from '$lib/utils';
	import dayjs from 'dayjs';
	import { ArrowLeft, ContrastIcon, MenuIcon } from 'lucide-svelte';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import pMap from 'p-map';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';

	export let data;

	type ImageState = 'idle' | 'preloading' | 'preloaded';

	let imageEl: HTMLImageElement;
	let pageSelect: HTMLSelectElement;
	let container: HTMLDivElement;

	let preferencesOpen = false;
	let previewLayout = false;

	let pageState: (Image & { state: ImageState })[] = data.archive.images.map((image) => ({
		...image,
		state: 'idle',
	}));

	$: archive = data.archive;
	$: prefs = data.prefs;

	$: currentPage = $page.state.page || parseInt($page.params.page!);
	$: image = archive.images.find((image) => image?.page_number === currentPage);

	$: prevPage = currentPage > 1 ? currentPage - 1 : undefined;
	$: nextPage = currentPage < archive.pages ? currentPage + 1 : undefined;

	$: prevPageUrl = prevPage ? `${prevPage}${$page.url.search}` : undefined;
	$: nextPageUrl = nextPage ? `${nextPage}${$page.url.search}` : undefined;

	const changePage = (page?: number) => {
		if (!page) {
			return;
		}

		const imageInfo = archive.images.find((image) => image.page_number === page);

		if (!imageInfo) {
			return;
		}

		const newImage = new Image(imageInfo.width, imageInfo.height);
		newImage.src = `${env.CDN_URL}/image/${archive.hash}/${page}`;
		newImage.alt = `Page ${currentPage}`;
		newImage.onerror = () => toast.error('Failed to load the page');

		imageEl.classList.forEach((className) => newImage.classList.add(className));
		imageEl.replaceWith(newImage);
		imageEl = newImage;

		replaceState(page.toString(), { page });
		container.scrollTo({ top: 0 });
	};

	const changePageState = (page: number, newState: ImageState) => {
		pageState = pageState.map((state) => {
			if (state.page_number === page) {
				state.state = newState;
			}

			return state;
		});
	};

	const preloadImages = async () => {
		await pMap(
			[currentPage + 1, currentPage + 2, currentPage - 1, currentPage + 3, currentPage - 2]
				.filter((page) => archive.images.some(({ page_number }) => page_number === page))
				.filter((page) => pageState.find((state) => state.page_number === page)!.state === 'idle')
				.map((page) => archive.images.find(({ page_number }) => page_number === page)!),
			async (imageInfo) => {
				const { page_number } = imageInfo;

				changePageState(page_number, 'preloading');

				const newImage = new Image(imageInfo.width, imageInfo.height);
				newImage.src = `${env.CDN_URL}/image/${archive.hash}/${page_number}`;

				if (newImage.complete) {
					newImage.addEventListener('error', () => changePageState(page_number, 'preloaded'));
				} else {
					newImage.addEventListener('load', () => changePageState(page_number, 'preloaded'));
					newImage.addEventListener('error', () => changePageState(page_number, 'idle'));
				}
			},
			{ concurrency: 2 }
		);
	};

	const getContainerStyle = (prefs: ReaderPreferences, image: Image | undefined) => {
		if (!image) {
			return;
		}

		const base = `aspect-ratio: ${image.width / image.height};`;

		switch (prefs.fitMode) {
			case ImageFitMode.MaxWidth:
				if (prefs.maxWidth) {
					return base + `max-height: ${(prefs.maxWidth * image.height) / image.width}px;`;
				}
			case ImageFitMode.ImageWidth:
				return base + `max-height: ${image.height}px;`;
			case ImageFitMode.FitHeight:
				return base + 'max-height: 100%';
		}
	};

	const getImageStyle = (prefs: ReaderPreferences) => {
		switch (prefs.fitMode) {
			case ImageFitMode.ImageWidth:
				return ``;
			case ImageFitMode.MaxWidth:
				if (prefs.maxWidth) {
					return `max-width: clamp(0px, ${prefs.maxWidth}px, 100%);`;
				} else {
					return `max-width: '100%';`;
				}
			case ImageFitMode.FitHeight:
				return `width: auto; max-height: 100%;`;
		}
	};

	const onPlacemenetChange = (placement: string) => {
		prefs.barPlacement = placement as BarPlacement;
	};

	const onModeChange = (mode: string | undefined) => {
		prefs.fitMode = (mode ?? ImageFitMode.FitHeight) as ImageFitMode;
	};

	$: {
		if (imageEl && currentPage) {
			preloadImages();
		}
	}

	$: {
		if (imageEl && prefs) {
			imageEl.style.cssText = getImageStyle(prefs);
		}
	}

	$: {
		if (browser) {
			document.cookie = `reader=${JSON.stringify(prefs)}; Path=/; Max-Age=${dayjs(dayjs().add(1, 'year')).diff(dayjs(), 'seconds')}`;
		}
	}

	let showBar = true;
	let timeout = 0;

	const resetTimeout = () => {
		clearTimeout(timeout);

		timeout = setTimeout(() => {
			showBar = false;
		}, 3000);
	};

	$: {
		if (showBar) {
			resetTimeout();
		}
	}

	$: {
		if (preferencesOpen) {
			clearTimeout(timeout);
		} else {
			resetTimeout();
		}
	}
</script>

<svelte:head>
	<title>Page {currentPage} • {archive.title} • Faccina</title>
</svelte:head>

<svelte:window
	on:keydown={(event) => {
		if (preferencesOpen) {
			return;
		}

		switch (event.key) {
			case 'ArrowLeft':
				if (prevPageUrl) {
					goto(prevPageUrl);
				}
				break;
			case 'ArrowRight':
				if (nextPageUrl) {
					goto(nextPageUrl);
				}
				break;
			case 'ArrowUp':
				goto(`/g/${archive.id}${$page.url.search}`);
		}
	}}
/>

<div class="flex h-dvh w-full flex-col overflow-clip">
	{#if showBar}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			in:fly={{
				duration: 150,
				y: prefs.barPlacement === 'bottom' ? '3rem' : '-3rem',
				opacity: 1,
			}}
			out:fly={{
				duration: 150,
				y: prefs.barPlacement === 'bottom' ? '3rem' : '-3rem',
				opacity: 1,
			}}
			class={cn(
				'fixed inset-x-0 z-10 overflow-clip',
				prefs.barPlacement === 'bottom' ? 'bottom-0' : 'top-0'
			)}
			on:click={() => resetTimeout()}
			on:mousemove={() => resetTimeout()}
		>
			<div
				class="bg-background relative mx-auto flex h-12 w-full items-center justify-between px-2"
			>
				<a
					href={`/g/${archive.id}${$page.url.search}`}
					draggable="false"
					class="text-muted-foreground-light inline-flex h-full items-center justify-center p-0 text-sm font-medium underline-offset-4 hover:underline"
				>
					<ArrowLeft class="size-5" />
					<span class="sr-only">Go back</span>
				</a>

				<div class="absolute inset-0 mx-auto flex w-fit items-center">
					<a
						href={prevPageUrl}
						on:click|preventDefault={() => changePage(prevPage)}
						draggable="false"
						class={cn(
							'text-muted-foreground-light inline-flex h-full items-center justify-center px-8 py-0 text-sm font-medium underline-offset-4 hover:underline',
							!prevPage && 'pointer-events-none opacity-40'
						)}
					>
						<ChevronLeft class="me-2" />
					</a>

					<div class="relative w-20 sm:w-24">
						<select
							bind:this={pageSelect}
							class="absolute inset-0 -z-10 mx-auto w-fit opacity-0"
							on:change={(ev) => changePage(parseInt(ev.currentTarget.value))}
						>
							{#each archive.images as image}
								<option value={image.page_number} selected={currentPage === image.page_number}>
									{image.page_number}
								</option>
							{/each}

							<span> {currentPage}</span> /
							<span>{archive.images.length}</span>
						</select>

						<Button
							variant="link"
							class="w-full whitespace-pre font-medium underline-offset-4"
							on:click={() => pageSelect.showPicker()}
						>
							<span>{currentPage}</span>&ThickSpace;/&ThickSpace;<span>
								{archive.images.length}
							</span>
						</Button>
					</div>

					<a
						href={nextPageUrl}
						on:click|preventDefault={() => changePage(nextPage)}
						draggable="false"
						class={cn(
							'text-muted-foreground-light inline-flex h-full items-center justify-center px-8 py-0 text-sm font-medium underline-offset-4 hover:underline ',
							!nextPage && 'pointer-events-none opacity-40'
						)}
					>
						<ChevronRight class="ms-2" />
					</a>
				</div>

				<Button
					draggable="false"
					variant="link"
					class="text-muted-foreground-light inline-flex h-full items-center justify-center p-0 text-sm font-medium underline-offset-4 hover:underline"
					on:click={() => (preferencesOpen = true)}
				>
					<MenuIcon class="size-5" />
					<span class="sr-only">Open reader preferences</span>
				</Button>
			</div>
		</div>
	{/if}

	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		bind:this={container}
		class="relative my-auto flex h-full overflow-auto"
		on:mousemove={(ev) => {
			if (prefs.barPlacement === 'bottom' && window.innerHeight - ev.clientY <= remToPx(4)) {
				showBar = true;
				resetTimeout();
			} else if (
				prefs.barPlacement === 'top' &&
				window.innerHeight + ev.clientY - window.innerHeight <= remToPx(4)
			) {
				showBar = true;
				resetTimeout();
			}
		}}
	>
		<div
			class="absolute inset-0 flex min-h-full min-w-full max-w-full"
			style={getContainerStyle(prefs, image)}
		>
			<a
				class={cn(
					'relative h-full flex-grow',
					previewLayout && 'flex items-center justify-center bg-blue-500/50'
				)}
				href={prevPageUrl}
				draggable="false"
				on:click|preventDefault={() => changePage(prevPage)}
			>
				<span class="sr-only"> Previous page </span>
			</a>
			<button class="h-full min-w-28 max-w-56 basis-[20%]" on:click={() => (showBar = !showBar)} />
			<a
				class={cn('relative h-full flex-grow', previewLayout && 'bg-red-500/50')}
				href={nextPageUrl}
				draggable="false"
				on:click|preventDefault={() => changePage(nextPage)}
			>
				<span class="sr-only"> Next page </span>
			</a>
		</div>

		{#if previewLayout}
			<div class="pointer-events-none fixed inset-0 flex h-full min-w-full max-w-full opacity-100">
				<div class="relative flex h-full flex-grow items-center justify-center">
					<span class="stroke rounded-md text-2xl font-semibold uppercase tracking-wider">
						Prev
					</span>
				</div>
				<div class="h-full min-w-28 max-w-56 basis-[20%]"></div>
				<div class="relative flex h-full flex-grow items-center justify-center">
					<span class="stroke rounded-md text-2xl font-semibold uppercase tracking-wider">
						Next
					</span>
				</div>
			</div>
		{/if}

		<img
			bind:this={imageEl}
			height={image?.height}
			width={image?.width}
			alt={`Page ${currentPage}`}
			src={`${env.CDN_URL}/image/${archive.hash}/${currentPage}`}
			loading="eager"
			style={getImageStyle(prefs)}
			class="m-auto bg-neutral-500"
			on:error={() => toast.error('Failed to load the page')}
		/>
	</div>
</div>

<Dialog.Root bind:open={preferencesOpen}>
	<Dialog.Content>
		<h3 class="text-lg font-medium">Touch layout</h3>

		<div class="flex items-center">
			<Label for="preview-layout" class="w-full">Preview touch layout</Label>
			<Checkbox id="preview-layout" bind:checked={previewLayout} />
		</div>

		<Label for="bar-placement">Control bar placement</Label>
		<RadioGroup.Root
			value={prefs.barPlacement}
			id="bar-placement"
			onValueChange={onPlacemenetChange}
		>
			<div class="flex items-center space-x-2">
				<RadioGroup.Item value="top" id="top" />
				<Label for="top">Top</Label>
			</div>
			<div class="flex items-center space-x-2">
				<RadioGroup.Item value="bottom" id="bottom" />
				<Label for="bottom">Bottom</Label>
			</div>
		</RadioGroup.Root>

		<Separator />

		<h3 class="text-lg font-medium">Image scaling</h3>

		<ToggleGroup.Root
			id="fit-mode"
			variant="outline"
			type="single"
			value={prefs.fitMode}
			onValueChange={onModeChange}
		>
			<ToggleGroup.Item value={ImageFitMode.FitHeight}>Fit Height</ToggleGroup.Item>
			<ToggleGroup.Item value={ImageFitMode.MaxWidth}>Max Width</ToggleGroup.Item>
			<ToggleGroup.Item value={ImageFitMode.ImageWidth}>Image Width</ToggleGroup.Item>
		</ToggleGroup.Root>

		<div class="flex items-center">
			<Label for="max-width" class="w-full">Max width</Label>
			<Input
				id="max-width"
				type="number"
				value={prefs.maxWidth}
				class="w-24"
				on:change={(event) => (prefs.maxWidth = parseInt(event.currentTarget.value) || undefined)}
			/>
		</div>
	</Dialog.Content>
</Dialog.Root>
