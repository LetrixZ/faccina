<script lang="ts">
	import { cn } from '$lib/utils';
	import type { TouchLayoutOption } from './reader.svelte';

	type Props = {
		ref?: HTMLElement | null;
		selectedTouchLayoutOption: TouchLayoutOption;
		previewLayout: boolean;
		hasPrevious: boolean;
		hasNext: boolean;
		onPrevious: () => void;
		onNext: () => void;
		onMenu: (value?: boolean) => void;
	};

	let {
		ref = $bindable(null),
		selectedTouchLayoutOption,
		previewLayout,
		hasPrevious,
		hasNext,
		onPrevious,
		onNext,
		onMenu,
	}: Props = $props();
</script>

<div
	bind:this={ref}
	class="absolute inset-x-0 grid h-full w-full"
	style="grid-template-columns: repeat({selectedTouchLayoutOption.rows[0]?.length}, minmax(0, 1fr))"
>
	{#each selectedTouchLayoutOption.rows as row}
		{#each row as column}
			{#if column === 'p'}
				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button
					class={cn('outline-none', previewLayout && 'bg-red-500/60')}
					disabled={!hasPrevious}
					draggable="false"
					onclick={onPrevious}
					tabindex="-1"
				></button>
			{:else if column === 'n'}
				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button
					class={cn('outline-none', previewLayout && 'bg-green-500/60')}
					disabled={!hasNext}
					draggable="false"
					onclick={onNext}
					tabindex="-1"
				></button>
			{:else}
				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button
					class={cn('outline-none', previewLayout && 'bg-neutral-500/60')}
					draggable="false"
					onclick={() => onMenu()}
					tabindex="-1"
				></button>
			{/if}
		{/each}
	{/each}
</div>
