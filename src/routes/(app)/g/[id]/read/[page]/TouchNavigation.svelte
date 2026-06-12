<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { TouchLayoutOption } from './reader.svelte.js';

	let {
		navContainer = $bindable(),
		selectedTouchLayoutOption,
		previewLayout,
		hasPrevious,
		hasNext,
		onPrevious,
		onNext,
		onMenu
	}: {
		navContainer: HTMLDivElement | undefined;
		selectedTouchLayoutOption: TouchLayoutOption;
		previewLayout: boolean;
		hasPrevious: boolean;
		hasNext: boolean;
		onPrevious: () => void;
		onNext: () => void;
		onMenu: (value?: boolean) => void;
	} = $props();
</script>

<div
	bind:this={navContainer}
	class="absolute inset-x-0 grid h-full w-full"
	style="grid-template-columns: repeat({selectedTouchLayoutOption.rows[0]?.length}, minmax(0, 1fr))"
>
	{#each selectedTouchLayoutOption.rows as row, i (i)}
		{#each row as column, j (j)}
			{#if column === 'p'}
				<button
					class={cn('outline-none', previewLayout && 'bg-red-500/60')}
					disabled={!hasPrevious}
					draggable="false"
					onclick={onPrevious}
					tabindex="-1"
					title="Previous"
				></button>
			{:else if column === 'n'}
				<button
					class={cn('outline-none', previewLayout && 'bg-green-500/60')}
					disabled={!hasNext}
					draggable="false"
					onclick={onNext}
					tabindex="-1"
					title="Next"
				></button>
			{:else}
				<button
					class={cn('outline-none', previewLayout && 'bg-neutral-500/60')}
					draggable="false"
					onclick={() => onMenu()}
					tabindex="-1"
					title="Menu"
				></button>
			{/if}
		{/each}
	{/each}
</div>
