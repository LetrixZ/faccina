<script lang="ts">
	import { cn } from '$lib/utils';
	import type { TouchLayoutOption } from './reader';

	export let selectedTouchLayoutOption: TouchLayoutOption;
	export let previewLayout: boolean;

	export let hasPrevious: boolean;
	export let hasNext: boolean;

	export let onPrevious: () => void;
	export let onNext: () => void;
	export let onMenu: (value?: boolean) => void;

	export let navContainer: HTMLDivElement;
</script>

<div
	bind:this={navContainer}
	style="grid-template-columns: repeat({selectedTouchLayoutOption.rows[0]?.length}, minmax(0, 1fr))"
	class="absolute inset-x-0 grid h-full w-full"
>
	{#each selectedTouchLayoutOption.rows as row}
		{#each row as column}
			{#if column === 'p'}
				<button
					class={cn('outline-none', previewLayout && 'bg-red-500/60')}
					disabled={!hasPrevious}
					draggable="false"
					tabindex="-1"
					on:click={onPrevious}
				></button>
			{:else if column === 'n'}
				<button
					class={cn('outline-none', previewLayout && 'bg-green-500/60')}
					disabled={!hasNext}
					draggable="false"
					tabindex="-1"
					on:click={onNext}
				></button>
			{:else}
				<button
					class={cn('outline-none', previewLayout && 'bg-neutral-500/60')}
					draggable="false"
					tabindex="-1"
					on:click={() => onMenu()}
				></button>
			{/if}
		{/each}
	{/each}
</div>
