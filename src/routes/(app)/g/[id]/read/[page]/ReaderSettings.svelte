<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { type Gallery, type Image as GalleryImage } from '$lib/types.js';
	import { cn, formatLabel, getImageDimensions, getImageUrl } from '$lib/utils.js';
	import {
		reader,
		readingModeOptions,
		reverseLayoutOptions,
		scalingOptions,
		type Scaling
	} from './reader.svelte.js';
	import Image from '@lucide/svelte/icons/image';
	import Info from '@lucide/svelte/icons/info';
	import type { ReaderPreset } from '~shared/config/image.schema.js';

	let {
		open,
		previewLayout = $bindable(),
		gallery,
		currentPage,
		currentImage,
		scrollContainer,
		presets,
		selectedPreset,
		imageServer,
		readerAllowOriginal,
		onOpenChange
	}: {
		open: boolean;
		previewLayout?: boolean;
		gallery: Gallery;
		currentPage: number;
		currentImage: GalleryImage;
		scrollContainer?: HTMLDivElement;
		presets: ReaderPreset[];
		selectedPreset?: ReaderPreset;
		readerAllowOriginal: boolean;
		imageServer: string;
		onOpenChange?: (open: boolean) => void;
	} = $props();

	let containers: HTMLButtonElement[] = $state([]);

	const selectedReadingMode = $derived(reader.current?.readingMode);

	const calculateHeight = (width: number) =>
		Math.round((width * currentImage.height!) / currentImage.width!);

	const getStyle = (
		image: GalleryImage,
		preset: ReaderPreset | undefined,
		scaling: Scaling,
		container: HTMLButtonElement | undefined
	) => {
		if (!scaling || !container) {
			return '';
		}

		const { width, height } = getImageDimensions(image, preset);

		switch (scaling) {
			case 'original': {
				const ratio = width / height;

				if (ratio < 1) {
					return `width: 70%; margin: 0 auto;`;
				} else {
					return `height: ${container.clientHeight}px; width: auto;`;
				}
			}
			case 'fill-width':
				return '';
			case 'fill-height':
				return `height: ${container.clientHeight}px; width: auto;`;
		}
	};
</script>

<Dialog.Root {onOpenChange} {open}>
	<Dialog.Content
		class="h-fit max-h-[90dvh] overflow-y-auto bg-background/95 md:max-w-2xl"
		overlayClass="bg-background/70"
	>
		{#if presets.length}
			<p class="title">Image resampling</p>

			<div
				class="grid gap-4 max-md:grid-cols-2!"
				style="grid-template-columns: repeat({Math.min(
					4,
					presets.length + (readerAllowOriginal ? 1 : 0)
				)}, minmax(0, 1fr));"
			>
				{#if readerAllowOriginal}
					<Button
						class={cn('relative pe-8', selectedPreset === undefined && 'ring ring-primary')}
						onclick={() => reader.setImagePreset(null)}
						variant="outline"
					>
						<span class="truncate"> Original </span>
					</Button>
				{/if}

				{#each presets as preset (preset.hash)}
					<Button
						class={cn('relative pe-8', preset.hash === selectedPreset?.hash && 'ring ring-primary')}
						onclick={() =>
							selectedPreset?.hash === preset.hash
								? readerAllowOriginal && reader.setImagePreset(null)
								: reader.setImagePreset(preset)}
						variant="outline"
					>
						<span class="truncate"> {preset.label} </span>

						<Tooltip.Root>
							<Tooltip.Trigger class="absolute inset-e-2 " tabindex={-1}>
								<Info class="size-4 text-neutral-300" />
							</Tooltip.Trigger>
							<Tooltip.Content class="text-start">
								<p>Format: {formatLabel(preset.format)}</p>
								{#if preset.width}
									<p>Width: {preset.width}px</p>
									<p>Height: {calculateHeight(preset.width)}px</p>
								{/if}
							</Tooltip.Content>
						</Tooltip.Root>
					</Button>
				{/each}
			</div>
		{/if}

		<p class="title">Reading mode</p>

		<div class="grid gap-4 md:grid-cols-2">
			{#each readingModeOptions as option (option.value)}
				<Button
					class={cn('relative pe-8', option.value === selectedReadingMode && 'ring ring-primary')}
					onclick={() => reader.setReadingMode(option.value)}
					variant="outline"
				>
					<span class="truncate"> {option.label} </span>
				</Button>
			{/each}
		</div>

		<div class="space-y-1 md:w-fit">
			<Label>Gap between pages</Label>
			<Input
				disabled={reader.current?.readingMode !== 'continuous-vertical'}
				min="0"
				onchange={(ev) => reader.setVerticalGap(parseInt(ev.currentTarget.value))}
				type="number"
				value={reader.current?.verticalGap}
			/>
		</div>

		<p class="title">Page scaling</p>

		<div class="grid grid-cols-3 gap-4">
			{#each scalingOptions as option, i (option.value)}
				<div class="scaling-preview text-sm font-medium flex flex-col items-center gap-2">
					<button
						bind:this={containers[i]}
						class={cn(
							'rounded bg-neutral-900 flex aspect-video self-start justify-center overflow-hidden w-full',
							reader.current?.scaling === option.value && 'ring ring-primary'
						)}
						onclick={() => {
							reader.setScaling(option.value);
							scrollContainer?.scrollTo({ top: 0, behavior: 'instant' });
						}}
					>
						<div>
							<img
								alt="{gallery.title} page {currentPage}"
								class="brightness-75"
								height={currentImage.height}
								src={getImageUrl(currentPage, gallery, selectedPreset, imageServer)}
								style={getStyle(currentImage, selectedPreset, option.value, containers[i])}
								width={currentImage.width}
							/>
						</div>
					</button>

					<p>{option.label}</p>
				</div>
			{/each}
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-1">
				<Label>Min width</Label>
				<Input
					disabled={reader.current?.scaling !== 'original'}
					min="0"
					oninput={(ev) => reader.setMinWidth(parseInt(ev.currentTarget.value))}
					type="number"
					value={reader.current?.minWidth}
				/>
			</div>

			<div class="space-y-1">
				<Label>Max width</Label>
				<Input
					disabled={reader.current?.scaling !== 'original'}
					min="0"
					oninput={(ev) => reader.setMaxWidth(parseInt(ev.currentTarget.value))}
					type="number"
					value={reader.current?.maxWidth}
				/>
			</div>
		</div>

		<p class="title">Touch layout</p>

		<div class="grid gap-6 md:grid-cols-2">
			<div class="flex grow justify-evenly gap-6">
				{#each reader.touchLayoutOptions as layout (layout.name)}
					<button
						class={cn(
							'relative flex aspect-17/24 h-28 items-center justify-center overflow-hidden rounded bg-neutral-800',
							layout.name === reader.current?.touchLayout && 'ring ring-primary'
						)}
						onclick={() => reader.setTouchLayout(layout.name)}
					>
						<Image class="size-12 text-neutral-500/50" />
						<div
							class="absolute inset-0 m-auto grid"
							style="grid-template-columns: repeat({layout.rows[0]?.length}, minmax(0, 1fr))"
						>
							{#each layout.rows as row, i (i)}
								{#each row as column, j (j)}
									{#if column === 'p'}
										<div class="bg-red-500/60"></div>
									{:else if column === 'n'}
										<div class="bg-green-500/60"></div>
									{:else}
										<div class="bg-neutral-500/60"></div>
									{/if}
								{/each}
							{/each}
						</div>
					</button>
				{/each}
			</div>

			<div class="grid gap-1 text-sm">
				<div class="flex items-center gap-2">
					<div class="size-3.5 rounded bg-red-500/60"></div>
					<span> Previous page</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="size-3.5 rounded bg-green-500/60"></div>
					<span> Next page </span>
				</div>
				<div class="flex items-center gap-2">
					<div class="size-3.5 rounded bg-neutral-500/60"></div>
					<span> Toolbar </span>
				</div>

				<div class="mt-1 flex items-center gap-4">
					<Label class="w-full" for="preview">Preview layout</Label>
					<Checkbox bind:checked={previewLayout} id="preview" />
				</div>
			</div>
		</div>

		<p class="title">Invert touch layout</p>

		<RadioGroup.Root
			class="grid grid-cols-2 md:grid-cols-4"
			onValueChange={(value) => reader.setReverseLayout(value)}
			value={reader.current?.reverseLayout}
		>
			{#each reverseLayoutOptions as option (option.value)}
				<div class="flex items-center space-x-2">
					<RadioGroup.Item id={option.value} value={option.value} />
					<Label class="w-full cursor-pointer" for={option.value}>{option.label}</Label>
				</div>
			{/each}
		</RadioGroup.Root>

		<p class="title">Toolbar position</p>

		<RadioGroup.Root
			class="grid grid-cols-2 md:grid-cols-4"
			onValueChange={(value) => reader.setToolbarPosition(value)}
			value={reader.current?.toolbarPosition}
		>
			<div class="flex items-center space-x-2">
				<RadioGroup.Item id="top" value="top" />
				<Label class="w-full cursor-pointer" for="top">Top</Label>
			</div>

			<div class="flex items-center space-x-2">
				<RadioGroup.Item id="bottom" value="bottom" />
				<Label class="w-full cursor-pointer" for="bottom">Bottom</Label>
			</div>
		</RadioGroup.Root>
	</Dialog.Content>
</Dialog.Root>
