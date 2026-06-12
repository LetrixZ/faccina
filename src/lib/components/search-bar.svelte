<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import type { Tag } from '$lib/types.js';
	import { cn } from '$lib/utils.js';
	import Search from '@lucide/svelte/icons/search';

	let {
		tags,
		searchPlaceholder = '',
		onSearch
	}: {
		tags: Tag[];
		searchPlaceholder?: string;
		onSearch?: (query: string) => void;
	} = $props();

	let formEl: HTMLFormElement | null = $state(null);
	let inputEl: HTMLInputElement | null = $state(null);

	let query = $state('');

	const sort = $derived(page.url.searchParams.get('sort'));
	const order = $derived(page.url.searchParams.get('order'));

	let selectPosition = $state(-1);
	let highligtedIndex = $state(-1);
	let isFocused = $state(false);
	let popoverOpen = $state(false);
	let closedByOutsideClick = $state(false);

	// svelte-ignore non_reactive_update
	let negate = false;
	// svelte-ignore non_reactive_update
	let or = false;

	const filteredTags = $derived.by(() => {
		let value = query.trim().toLowerCase();
		if (!value.length) {
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

		if (!value.trim().length || value === '-' || value === '~') {
			return [];
		}

		negate = value[0] === '-';
		or = value[0] === '~';

		if (negate || or) {
			value = value.substring(1);
		}

		return tags
			.filter(({ namespace, name }) => {
				return (
					`${namespace}:${name}`.toLowerCase().includes(value) ||
					`${namespace}:"${name}"`.toLowerCase().includes(value)
				);
			})
			.slice(0, 5);
	});

	$effect(() => {
		if (!isFocused) {
			highligtedIndex = -1;
		}
	});

	const insertTag = async (input: HTMLInputElement, index?: number) => {
		const currentPosition = input.selectionStart;

		if (currentPosition === null) {
			return;
		}

		let wordEnd = currentPosition;
		let wordStart = currentPosition;

		if (query[currentPosition - 1] !== ' ') {
			if (wordEnd < query.length) {
				while (query[wordEnd] && query[wordEnd] !== ' ') {
					wordEnd++;
				}
			}

			while (query[wordStart - 1] && query[wordStart - 1] !== ' ') {
				wordStart--;
			}
		}

		const tag = filteredTags[index ?? highligtedIndex];

		if (!tag) {
			return;
		}

		let tagValue =
			`${tag.namespace}:${tag.name.split(' ').length > 1 ? `"${tag.name}"` : tag.name} `.toLowerCase();

		if (negate) {
			tagValue = '-' + tagValue;
		} else if (or) {
			tagValue = '~' + tagValue;
		}

		query = query.substring(0, wordStart) + tagValue + query.substring(wordEnd).trimStart();

		highligtedIndex = -1;
		popoverOpen = false;

		setTimeout(() => {
			inputEl?.setSelectionRange(wordStart + tagValue.length, wordStart + tagValue.length);
		}, 1);
	};
</script>

<div class="h-8 w-full">
	<Popover.Root
		onOpenChange={(open) => (popoverOpen = open)}
		open={!!filteredTags.length && popoverOpen}
	>
		<form
			bind:this={formEl}
			class="relative flex h-full w-full items-center rounded-md bg-muted ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
			onsubmit={(ev) => {
				ev.preventDefault();
				popoverOpen = false;
				onSearch?.(query);
			}}
		>
			<Popover.Trigger class="absolute -bottom-3.5 w-full" />
			<Input
				autocomplete="off"
				bind:ref={inputEl}
				bind:value={query}
				class="h-fit grow border-0 bg-transparent py-2 ring-0! ring-offset-0!"
				name="q"
				onblur={() => (isFocused = false)}
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
				placeholder={searchPlaceholder}
				type="search"
			/>

			{#if sort}
				<input class="hidden" name="sort" value={sort} />
			{/if}

			{#if order}
				<input class="hidden" name="order" value={order} />
			{/if}

			<Button
				class="aspect-square h-full rounded p-0 text-muted-foreground ring-0! ring-offset-0! focus-within:text-foreground"
				type="submit"
				variant="ghost"
			>
				<span class="sr-only">Search</span>
				<Search class="size-5" />
			</Button>
		</form>

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
			portalProps={{ to: formEl }}
		>
			{#each filteredTags as tag, i (tag)}
				{@const value =
					`${negate ? '-' : ''}${or ? '~' : ''}${tag.namespace}:${tag.name.split(' ').length > 1 ? `"${tag.name}"` : tag.name}`.toLowerCase()}

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
					{value}
				</Button>
			{/each}
		</Popover.Content>
	</Popover.Root>
</div>
