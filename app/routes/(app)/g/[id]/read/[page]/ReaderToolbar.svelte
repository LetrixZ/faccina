<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ChevronFirst from '@lucide/svelte/icons/chevron-first';
	import ChevronLast from '@lucide/svelte/icons/chevron-last';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Menu from '@lucide/svelte/icons/menu';
	import { linear } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import type { ToolbarPosition } from './reader.svelte';

	type Props = {
		currentPage: number;
		pages: number;
		visible: boolean;
		position: ToolbarPosition;
		onPage: (page: number) => void;
		onBack: () => void;
		onMenu: () => void;
	};

	let { currentPage, pages, visible = false, position, onPage, onBack, onMenu }: Props = $props();

	// svelte-ignore non_reactive_update
	let pageSelect: HTMLSelectElement;

	const hasPrevious = $derived(currentPage > 1);
	const hasNext = $derived(currentPage < pages);

	const pageOptions = $derived(new Array(pages).fill(0).map((_, i) => i + 1));

	const style = $derived(position === 'top' ? 'top: 0' : 'bottom: 0');
</script>

{#if visible}
	<div
		{style}
		class="fixed flex h-12 w-full justify-between bg-neutral-950/95 px-1 text-neutral-100 shadow-lg md:px-2"
		transition:slide={{ easing: linear, duration: 75 }}
	>
		<button onclick={onBack}>
			<ArrowLeft class="p-px" />
		</button>

		<div class="mx-auto flex items-center">
			<button
				class="px-2 disabled:opacity-50 md:px-8"
				disabled={!hasPrevious}
				onclick={() => onPage(1)}
			>
				<ChevronFirst />
			</button>
			<button
				class="px-2 disabled:opacity-50 md:px-8"
				disabled={!hasPrevious}
				onclick={() => onPage(currentPage - 1)}
			>
				<ChevronLeft />
			</button>
			<button
				class="relative w-36 px-1 text-sm font-medium underline-offset-4 hover:underline md:px-8"
				onclick={() => pageSelect.showPicker()}
			>
				{currentPage} / {pages}

				<select
					bind:this={pageSelect}
					class="invisible absolute inset-x-0 mx-auto w-fit"
					onchange={(ev) => onPage(parseInt(ev.currentTarget.value))}
				>
					{#each pageOptions as page}
						<option selected={currentPage === page} value={page}>{page}</option>
					{/each}
				</select>
			</button>
			<button
				class="px-2 disabled:opacity-50 md:px-8"
				disabled={!hasNext}
				onclick={() => onPage(currentPage + 1)}
			>
				<ChevronRight />
			</button>
			<button
				class="px-2 disabled:opacity-50 md:px-8"
				disabled={!hasNext}
				onclick={() => onPage(pages)}
			>
				<ChevronLast />
			</button>
		</div>

		<button onclick={onMenu}>
			<Menu class="p-px" />
		</button>
	</div>
{/if}
