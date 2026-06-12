<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { cn, slugify } from '../utils.js';
	import { Button } from './ui/button/index.js';
	import { Input } from './ui/input/index.js';

	let {
		id,
		chips = [],
		tags = [],
		placeholder,
		onUpdate
	}: {
		id?: string;
		chips: string[];
		tags: string[];
		placeholder?: string;
		onUpdate?: (value: string[]) => void;
	} = $props();

	let input = $state('');

	let containerEl: HTMLDivElement | null = $state(null);
	let inputEl: HTMLInputElement | null = $state(null);

	const removeChip = (chip: string) => {
		chips = chips.filter((_chip) => _chip !== chip);
		onUpdate?.(chips);
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

		chips = [...chips, aux];
		popoverOpen = false;
		onUpdate?.(chips);
		input = '';
	};

	let selectPosition = $state(-1);
	let highligtedIndex = $state(-1);
	let isFocused = $state(false);
	let popoverOpen = $state(false);
	let closedByOutsideClick = $state(false);

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
		onUpdate?.(chips);
		input = '';
	};

	const filteredTags = $derived.by(() => {
		let value = input.trim().toLowerCase();
		if (!value) {
			return [];
		}

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
	});

	$effect(() => {
		if (!isFocused) {
			highligtedIndex = -1;
		}
	});
</script>

<form
	class="rounded-md border border-input ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
	onsubmit={(ev) => {
		ev.preventDefault();
		submit();
	}}
>
	<Popover.Root
		onOpenChange={(open) => (popoverOpen = open)}
		open={!!filteredTags.length && popoverOpen}
	>
		<div bind:this={containerEl} class="relative">
			<Popover.Trigger class="absolute -bottom-3.5 w-full" />

			<Input
				autocomplete="off"
				bind:ref={inputEl}
				bind:value={input}
				class="border-0 focus-visible:ring-0"
				{id}
				name="q"
				onfocus={() => {
					isFocused = true;
					popoverOpen = true;
				}}
				oninput={() => {
					popoverOpen = true;
					setTimeout(() => {
						selectPosition = inputEl?.selectionStart ?? -1;
					}, 1);
				}}
				onkeydown={(ev) => {
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
				onselectionchange={() => {
					setTimeout(() => {
						selectPosition = inputEl?.selectionStart ?? -1;
					}, 1);
				}}
				{placeholder}
			/>
		</div>

		<Popover.Content
			align="start"
			class="grid w-fit p-0"
			onCloseAutoFocus={(ev) => {
				if (closedByOutsideClick) {
					ev.preventDefault();
					closedByOutsideClick = false;
				} else {
					ev.preventDefault();
					inputEl?.focus();
				}
			}}
			onInteractOutside={() => (closedByOutsideClick = true)}
			onOpenAutoFocus={(ev) => {
				ev.preventDefault();
				inputEl?.focus();
			}}
			portalProps={{ to: containerEl }}
		>
			{#each filteredTags as tag, i (`${tag}:${i}`)}
				<Button
					class={cn('justify-start', i === highligtedIndex && 'underline')}
					onclick={() => {
						inputEl?.focus();
						if (inputEl) {
							insertTag(inputEl, i);
						}
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
			{#each chips as chip, i (`${chip}:${i}`)}
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
