<script lang="ts">
	import ChevronFirst from 'lucide-svelte/icons/chevron-first';
	import ChevronLast from 'lucide-svelte/icons/chevron-last';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { linear } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Menu from 'lucide-svelte/icons/menu';
	import type { ToolbarPosition } from './reader';

	export let currentPage: number;
	export let pages: number;
	export let visible = false;
	export let position: ToolbarPosition;
	export let onPage: (page: number) => void;
	export let onBack: () => void;
	export let onMenu: () => void;

	let pageSelect: HTMLSelectElement;

	$: hasPrevious = currentPage > 1;
	$: hasNext = currentPage < pages;

	$: pageOptions = new Array(pages).fill(0).map((_, i) => i + 1);

	$: style = position === 'top' ? 'top: 0' : 'bottom: 0';
</script>

{#if visible}
	<div
		class="fixed flex h-12 w-full justify-between bg-neutral-950/95 px-1 text-neutral-100 shadow-lg md:px-2"
		{style}
		transition:slide={{ easing: linear, duration: 75 }}
	>
		<button on:click={onBack}>
			<ArrowLeft class="p-px" />
		</button>

		<div class="mx-auto flex items-center">
			<button
				class="px-2 disabled:opacity-50 md:px-8"
				disabled={!hasPrevious}
				on:click={() => onPage(1)}
			>
				<ChevronFirst />
			</button>
			<button
				class="px-2 disabled:opacity-50 md:px-8"
				disabled={!hasPrevious}
				on:click={() => onPage(currentPage - 1)}
			>
				<ChevronLeft />
			</button>
			<button
				class="relative w-24 px-2 text-sm font-medium underline-offset-4 hover:underline md:px-8"
				on:click={() => pageSelect.showPicker()}
			>
				{currentPage} / {pages}

				<select
					bind:this={pageSelect}
					class="invisible absolute inset-x-0 mx-auto w-fit"
					on:change={(ev) => onPage(parseInt(ev.currentTarget.value))}
				>
					{#each pageOptions as page}
						<option selected={currentPage === page} value={page}>{page}</option>
					{/each}
				</select>
			</button>
			<button
				class="px-2 disabled:opacity-50 md:px-8"
				disabled={!hasNext}
				on:click={() => onPage(currentPage + 1)}
			>
				<ChevronRight />
			</button>
			<button
				class="px-2 disabled:opacity-50 md:px-8"
				disabled={!hasNext}
				on:click={() => onPage(pages)}
			>
				<ChevronLast />
			</button>
		</div>

		<button on:click={onMenu}>
			<Menu class="p-px" />
		</button>
	</div>
{/if}
