<script lang="ts">
	import Image from 'lucide-svelte/icons/image';
	import Info from 'lucide-svelte/icons/info';
	import {
		readerStore,
		readingModeOptions,
		reverseLayoutOptions,
		scalingOptions,
		touchLayoutOptions,
	} from './reader';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { type Gallery, type Image as GalleryImage } from '$lib/types';
	import { cn, formatLabel } from '$lib/utils';
	import type { ReaderPreset } from '~shared/config/image.schema';

	export let open = false;
	export let onOpenChange: (value: boolean) => void;

	export let previewLayout = false;

	export let gallery: Gallery;

	export let currentPage: number;
	export let currentImage: GalleryImage;

	export let scrollContainer: HTMLDivElement | undefined;

	export let presets: ReaderPreset[];

	$: selectedPreset = $readerStore?.preset;
	$: selectedReadingMode = $readerStore?.readingMode;

	function calculateHeight(width: number) {
		return Math.round((width * currentImage.height!) / currentImage.width!);
	}
</script>

<Dialog.Root {onOpenChange} {open}>
	<Dialog.Content class="h-fit max-h-[90dvh] overflow-y-auto md:max-w-2xl">
		{#if presets.length}
			<p class="title">Image resampling</p>

			<div
				class="grid gap-4 max-md:!grid-cols-2"
				style="grid-template-columns: repeat({Math.min(4, presets.length)}, minmax(0, 1fr));"
			>
				{#each presets as preset}
					<Button
						class={cn('relative pe-8', preset.hash === selectedPreset && 'ring ring-primary')}
						on:click={() =>
							selectedPreset === preset.hash
								? readerStore.setImagePreset(null)
								: readerStore.setImagePreset(preset)}
						variant="outline"
					>
						<span class="truncate"> {preset.label} </span>

						<Tooltip.Root>
							<Tooltip.Trigger class="absolute end-2 " tabindex={-1}>
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
			{#each readingModeOptions as option}
				<Button
					class={cn('relative pe-8', option.value === selectedReadingMode && 'ring ring-primary')}
					on:click={() => readerStore.setReadingMode(option.value)}
					variant="outline"
				>
					<span class="truncate"> {option.label} </span>
				</Button>
			{/each}
		</div>

		<div class="space-y-1 md:w-fit">
			<Label>Gap between pages</Label>
			<Input
				disabled={$readerStore?.readingMode !== 'continuous-vertical'}
				min="0"
				on:change={(ev) => readerStore.setVerticalGap(parseInt(ev.currentTarget.value))}
				type="number"
				value={$readerStore?.verticalGap}
			/>
		</div>

		<p class="title">Page scaling</p>

		<div class="grid grid-cols-3 gap-4">
			{#each scalingOptions as option}
				<div class="scaling-preview">
					<button
						class:selected={$readerStore?.scaling === option.value}
						on:click={() => {
							readerStore.setScaling(option.value);
							scrollContainer?.scrollTo({ top: 0, behavior: 'instant' });
						}}
					>
						<div style={option.previewStyle}>
							<img
								alt="{gallery.title} page {currentPage}"
								height={currentImage.height}
								src="/image/{gallery.hash}/{currentPage}"
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
					disabled={$readerStore?.scaling !== 'original'}
					min="0"
					on:input={(ev) => readerStore.setMinWidth(parseInt(ev.currentTarget.value))}
					type="number"
					value={$readerStore?.minWidth}
				/>
			</div>

			<div class="space-y-1">
				<Label>Max width</Label>
				<Input
					disabled={$readerStore?.scaling !== 'original'}
					min="0"
					on:input={(ev) => readerStore.setMaxWidth(parseInt(ev.currentTarget.value))}
					type="number"
					value={$readerStore?.maxWidth}
				/>
			</div>
		</div>

		<p class="title">Touch layout</p>

		<div class="grid gap-6 md:grid-cols-2">
			<div class="flex flex-grow justify-evenly gap-6">
				{#each $touchLayoutOptions as layout}
					<button
						class={cn(
							'relative flex aspect-[17/24] h-28 items-center justify-center overflow-hidden rounded bg-neutral-800',
							layout.name === $readerStore?.touchLayout && 'ring ring-primary'
						)}
						on:click={() => readerStore.setTouchLayout(layout.name)}
					>
						<Image class="size-12 text-neutral-500/50" />
						<div
							class="absolute inset-0 m-auto grid"
							style="grid-template-columns: repeat({layout.rows[0]?.length}, minmax(0, 1fr))"
						>
							{#each layout.rows as row}
								{#each row as column}
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
			onValueChange={(value) => readerStore.setReverseLayout(value)}
			value={$readerStore?.reverseLayout}
		>
			{#each reverseLayoutOptions as option}
				<div class="flex items-center space-x-2">
					<RadioGroup.Item id={option.value} value={option.value} />
					<Label class="w-full cursor-pointer" for={option.value}>{option.label}</Label>
				</div>
			{/each}
		</RadioGroup.Root>

		<p class="title">Toolbar position</p>

		<RadioGroup.Root
			class="grid grid-cols-2 md:grid-cols-4"
			onValueChange={(value) => readerStore.setToolbarPosition(value)}
			value={$readerStore?.toolbarPosition}
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

<style lang="postcss">
	.scaling-preview {
		@apply text-sm font-medium;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.scaling-preview > button {
		@apply rounded bg-neutral-900;
		display: flex;
		aspect-ratio: 16/9;
		align-self: flex-start;
		justify-content: center;
		overflow: hidden;
	}

	.scaling-preview > button.selected {
		@apply ring ring-primary;
	}

	.scaling-preview > button > div {
		aspect-ratio: 17/24;
	}

	.scaling-preview img {
		filter: brightness(0.75);
	}
</style>
