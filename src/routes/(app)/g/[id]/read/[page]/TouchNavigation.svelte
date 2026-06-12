<script lang="ts">
	import type { TouchLayoutOption } from './reader';
	import { cn } from '$lib/utils';

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
	class="absolute inset-x-0 grid h-full w-full"
	style="grid-template-columns: repeat({selectedTouchLayoutOption.rows[0]?.length}, minmax(0, 1fr))"
>
	{#each selectedTouchLayoutOption.rows as row}
		{#each row as column}
			{#if column === 'p'}
				<button
					class={cn('outline-none', previewLayout && 'bg-red-500/60')}
					disabled={!hasPrevious}
					draggable="false"
					on:click={onPrevious}
					tabindex="-1"
				></button>
			{:else if column === 'n'}
				<button
					class={cn('outline-none', previewLayout && 'bg-green-500/60')}
					disabled={!hasNext}
					draggable="false"
					on:click={onNext}
					tabindex="-1"
				></button>
			{:else}
				<button
					class={cn('outline-none', previewLayout && 'bg-neutral-500/60')}
					draggable="false"
					on:click={() => onMenu()}
					tabindex="-1"
				></button>
			{/if}
		{/each}
	{/each}
</div>
