<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Tag } from '../types';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils';
	import PhMagnifyingGlass from '~icons/ph/magnifying-glass';

	export let tags: Tag[];
	export let searchPlaceholder = '';

	const dispatcher = createEventDispatcher<{ search: string }>();

	let formEl: HTMLFormElement;
	let inputEl: HTMLInputElement;

	let query = '';

	$: sort = $page.url.searchParams.get('sort');
	$: order = $page.url.searchParams.get('order');

	let selectPosition = -1;
	let highligtedIndex = -1;
	let isFocused = false;
	let popoverOpen = false;
	let negate = false;
	let or = false;

	$: filteredTags = query.trim().length
		? (() => {
				let value = query.toLowerCase();

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
					.filter(({ namespace, name, displayName }) => {
						return (
							`${namespace}:${name}`.toLowerCase().includes(value) ||
							`${namespace}:"${name}"`.toLowerCase().includes(value) ||
							displayName?.toLowerCase().includes(value)
						);
					})
					.slice(0, 5);
			})()
		: [];

	$: {
		if (!isFocused) {
			highligtedIndex = -1;
		}
	}

	const insertTag = async (input: HTMLInputElement, index?: number) => {
		let value = query;

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

		value = query.substring(0, wordStart) + tagValue + query.substring(wordEnd).trimStart();
		query = value;

		highligtedIndex = -1;
		popoverOpen = false;

		setTimeout(() => {
			inputEl.setSelectionRange(wordStart + tagValue.length, wordStart + tagValue.length);
		}, 1);
	};
</script>

<div class="h-8 w-full">
	<Popover.Root
		disableFocusTrap={true}
		onOpenChange={(open) => (popoverOpen = open)}
		open={!!filteredTags.length && popoverOpen}
		openFocus={inputEl}
		portal={formEl}
	>
		<form
			bind:this={formEl}
			class="relative flex h-full w-full items-center rounded-md bg-muted ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
			on:submit|preventDefault={() => {
				popoverOpen = false;
				dispatcher('search', query);
			}}
		>
			<Popover.Trigger class="absolute -bottom-3.5 w-full" />
			<Input
				autocomplete="off"
				bind:htmlInput={inputEl}
				bind:value={query}
				class="h-fit flex-grow border-0 bg-transparent py-2 !ring-0 !ring-offset-0"
				name="q"
				on:blur={() => (isFocused = false)}
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
				class="aspect-square h-full rounded p-0 text-muted-foreground !ring-0 !ring-offset-0 focus-within:text-foreground"
				type="submit"
				variant="ghost"
			>
				<span class="sr-only">Search</span>
				<PhMagnifyingGlass />
			</Button>
		</form>

		<Popover.Content align="start" class="grid w-fit p-0">
			{#each filteredTags as tag, i}
				{@const value =
					`${negate ? '-' : ''}${or ? '~' : ''}${tag.namespace}:${tag.name.split(' ').length > 1 ? `"${tag.name}"` : tag.name}`.toLowerCase()}

				<Button
					class={cn('justify-start', i === highligtedIndex && 'underline')}
					on:click={() => {
						inputEl.focus();
						insertTag(inputEl, i);
					}}
					variant="link"
				>
					{value}
				</Button>
			{/each}
		</Popover.Content>
	</Popover.Root>
</div>
