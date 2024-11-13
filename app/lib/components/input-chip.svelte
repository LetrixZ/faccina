<script lang="ts">
	import { run, preventDefault } from 'svelte/legacy';

	import { createEventDispatcher } from 'svelte';
	import { cn, slugify } from '../utils';
	import { Button } from './ui/button';
	import Input from './ui/input/input.svelte';
	import * as Popover from '$lib/components/ui/popover';

	interface Props {
		chips?: string[];
		id?: string | undefined;
		tags?: string[];
		placeholder?: string | undefined;
	}

	let {
		chips = $bindable([]),
		id = undefined,
		tags = [],
		placeholder = undefined
	}: Props = $props();

	const dispatch = createEventDispatcher<{ update: string[] }>();

	let input = $state('');

	let containerEl: HTMLDivElement = $state();
	let inputEl: HTMLInputElement = $state();

	const removeChip = (chip: string) => {
		chips = chips.filter((_chip) => _chip !== chip);

		dispatch('update', chips);
	};

	const submit = () => {
		if (!input.length) {
			return;
		}

		const exists = chips.find((chip) => chip === input);

		if (exists) {
			return;
		}

		let aux = input;

		if (aux.split(':').length === 1) {
			aux = `tag:${aux}`;
		}

		chips = [...chips, aux];
		popoverOpen = false;
		dispatch('update', chips);
		input = '';
	};

	let selectPosition = $state(-1);
	let highligtedIndex = $state(-1);
	let isFocused = $state(false);
	let popoverOpen = $state(false);

	run(() => {
		if (!isFocused) {
			highligtedIndex = -1;
		}
	});

	const insertTag = async (inputEl: HTMLInputElement, index?: number) => {
		const currentPosition = inputEl.selectionStart;

		if (currentPosition === null) {
			return;
		}

		let wordEnd = currentPosition;
		let wordStart = currentPosition;

		if (input[currentPosition - 1] !== ' ') {
			if (wordEnd < input.length) {
				while (input[wordEnd] && input[wordEnd] !== ' ') {
					wordEnd++;
				}
			}

			while (input[wordStart - 1] && input[wordStart - 1] !== ' ') {
				wordStart--;
			}
		}

		const tag = filteredTags[index ?? highligtedIndex];

		if (!tag) {
			return;
		}

		const exists = chips.find((chip) => slugify(chip) === slugify(tag));

		if (exists) {
			return;
		}

		chips = [...chips, tag];
		highligtedIndex = -1;
		popoverOpen = false;
		dispatch('update', chips);
		input = '';
	};

	let filteredTags = $derived(input.trim().length
		? (() => {
				let value = input.toLowerCase();

				if (value[selectPosition - 1] !== ' ') {
					let wordEnd = selectPosition;
					let wordStart = selectPosition;

					if (wordEnd < value.length) {
						while (value[wordEnd] && value[wordEnd] !== ' ') {
							wordEnd++;
						}
					}

					while (value[wordStart - 1] && value[wordStart - 1] !== ' ') {
						wordStart--;
					}

					if (wordStart >= 0 && wordEnd >= 0) {
						value = value.substring(wordStart, wordEnd);
					}
				} else {
					value = '';
				}

				if (!value.trim().length || value === '-') {
					return [];
				}

				return tags
					.filter((name) => {
						return (
							name.toLowerCase().includes(value) &&
							!chips.find((chip) => slugify(chip) === slugify(name))
						);
					})
					.slice(0, 5);
			})()
		: []);
</script>

<form
	class="rounded-md border border-input ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
	onsubmit={preventDefault(submit)}
>
	<Popover.Root
		disableFocusTrap={true}
		onOpenChange={(open) => (popoverOpen = open)}
		open={!!filteredTags.length && popoverOpen}
		openFocus={inputEl}
		portal={containerEl}
	>
		<div bind:this={containerEl} class="relative">
			<Popover.Trigger class="absolute -bottom-3.5 w-full" />

			<Input
				autocomplete="off"
				bind:htmlInput={inputEl}
				bind:value={input}
				class="border-0 focus-visible:ring-0"
				{id}
				name="q"
				on:focus={() => {
					isFocused = true;
					popoverOpen = true;
				}}
				on:input={() => {
					popoverOpen = true;
					setTimeout(() => {
						selectPosition = inputEl.selectionStart ?? -1;
					}, 1);
				}}
				on:keydown={(ev) => {
					switch (ev.key) {
						case 'Escape':
							ev.preventDefault();
							break;
						case 'ArrowDown':
							ev.preventDefault();
							if (highligtedIndex >= filteredTags.length) {
								highligtedIndex = -1;
							}

							highligtedIndex += 1;
							break;
						case 'ArrowUp':
							ev.preventDefault();

							if (highligtedIndex <= -1) {
								highligtedIndex = filteredTags.length;
							}

							highligtedIndex -= 1;
							break;
						case 'Enter':
							if (highligtedIndex >= 0) {
								ev.preventDefault();
							}

							insertTag(ev.currentTarget);

							break;
						case 'Tab':
							if (filteredTags.length) {
								ev.preventDefault();
								highligtedIndex = 0;
								insertTag(ev.currentTarget);
							}

							break;
					}
				}}
				on:selectionchange={() => {
					setTimeout(() => {
						selectPosition = inputEl.selectionStart ?? -1;
					}, 1);
				}}
				{placeholder}
			/>
		</div>

		<Popover.Content align="start" class="grid w-fit p-0">
			{#each filteredTags as tag, i}
				<Button
					class={cn('justify-start', i === highligtedIndex && 'underline')}
					on:click={() => {
						inputEl.focus();
						insertTag(inputEl, i);
					}}
					variant="link"
				>
					{tag}
				</Button>
			{/each}
		</Popover.Content>
	</Popover.Root>

	{#if chips?.length}
		<div class="flex flex-wrap gap-2 p-2">
			{#each chips as chip}
				<button
					class="rounded-md bg-secondary px-2 py-0.5 text-sm text-neutral-200 hover:bg-secondary/80 hover:text-white motion-safe:duration-150"
					onclick={() => removeChip(chip)}
					type="button"
				>
					{chip}
				</button>
			{/each}
		</div>
	{/if}
</form>
