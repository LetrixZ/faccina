<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import LoginForm from '$lib/components/login-form.svelte';
	import RecoverForm from '$lib/components/recover-form.svelte';
	import RegisterForm from '$lib/components/register-form.svelte';
	import ResetForm from '$lib/components/reset-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import type { UserFormState } from '$lib/models';
	import { appState } from '$lib/stores';
	import { cn } from '$lib/utils';
	import Book from '@lucide/svelte/icons/book';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import Clock from '@lucide/svelte/icons/clock';
	import Heart from '@lucide/svelte/icons/heart';
	import Home from '@lucide/svelte/icons/house';
	import LogIn from '@lucide/svelte/icons/log-in';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Search from '@lucide/svelte/icons/search';
	import Settings from '@lucide/svelte/icons/settings';
	import User from '@lucide/svelte/icons/user';
	import UserCircle from '@lucide/svelte/icons/user-round';
	import type { ActionResult } from '@sveltejs/kit';

	const { data, children } = $props();

	let loginOpen = $state(false);
	let userFormState = $state<UserFormState>('login');

	let formEl: HTMLFormElement;
	// svelte-ignore non_reactive_update
	let inputEl: HTMLInputElement;

	const formAction = $derived.by(() => {
		switch (page.route.id) {
			case '/(app)/favorites':
			case '/(app)/collections/[slug]':
			case '/(app)/series':
			case '/(app)/series/[id]':
				return page.url.pathname;
			default:
				return '/';
		}
	});

	const sort = $derived(page.url.searchParams.get('sort'));
	const order = $derived(page.url.searchParams.get('order'));
	const seed = $derived(page.url.searchParams.get('seed'));

	let query = $derived(page.url.searchParams.get('q') ?? '');

	let shouldAutocomplete = $state(true);

	let selectPosition = $state(-1);
	let highligtedIndex = $state(-1);
	let isFocused = $state(false);
	let popoverOpen = $state(false);
	let negate = $state(false);
	let or = $state(false);

	const filteredTags = $derived.by(() => {
		if (query.trim().length) {
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

			const tagMap = new Map();

			appState.tagList
				.filter(({ namespace, name }) => {
					return (
						`${namespace}:${name}`.toLowerCase().includes(value) ||
						`${namespace}:"${name}"`.toLowerCase().includes(value) ||
						`${namespace}:${name.replaceAll(' ', '_')}`.toLowerCase().includes(value) ||
						`${namespace}:"${name.replaceAll(' ', '_')}"`.toLowerCase().includes(value)
					);
				})
				.forEach((tag) => tagMap.set(`${tag.namespace}:"${tag.name}"`.toLowerCase(), tag));

			return Array.from(tagMap.values()).slice(0, 5);
		}

		return [];
	});

	$effect(() => {
		if (!isFocused) {
			highligtedIndex = -1;
		}
	});

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

	const handleUserFormResult = (result: ActionResult) => {
		if (result.type === 'success' || result.type === 'redirect') {
			loginOpen = false;
		}
	};

	const logout = () => {
		fetch(`/logout`, {
			method: 'POST',
		}).then(() => invalidateAll());
	};

	const showLogin = () => {
		userFormState = 'login';
		loginOpen = true;
	};

	$effect(() => {
		appState.userCollections = data.userCollections;
		appState.tagList = data.tagList;
	});
</script>

<svelte:head>
	<title>{data.site.name}</title>
</svelte:head>

<div class="bg-background dark:border-border fixed z-20 flex h-fit w-full border-b shadow">
	<Button
		class="text-muted-foreground hover:dark:text-primary size-12 rounded-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
		href="/"
		onclick={() => (query = '')}
		title="Go home"
		variant="ghost"
	>
		<Home class="size-6" />
	</Button>

	<Button
		class="text-muted-foreground hover:dark:text-primary size-12 rounded-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
		href="/series"
		onclick={() => (query = '')}
		title="Series"
		variant="ghost"
	>
		<Book class="size-6" />
	</Button>

	<div class="h-12 w-full flex-1 p-2">
		<Popover.Root
			onOpenChange={(open) => (popoverOpen = open)}
			open={shouldAutocomplete && !!filteredTags.length && popoverOpen}
		>
			<Popover.Portal>
				<form
					action={formAction}
					bind:this={formEl}
					class="bg-muted ring-offset-background focus-within:ring-ring hover:ring-ring relative flex h-full w-full items-center rounded-md focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-none hover:ring-2 hover:ring-offset-2"
					onsubmit={() => (popoverOpen = false)}
				>
					<Popover.Trigger class="absolute -bottom-3.5 w-full" />
					<Input
						autocomplete="off"
						bind:ref={inputEl}
						bind:value={query}
						class="h-fit flex-grow border-0 bg-transparent py-2 !ring-0 !ring-offset-0"
						name="q"
						onblur={() => (isFocused = false)}
						onfocus={() => {
							isFocused = true;
							popoverOpen = true;
						}}
						oninput={() => {
							popoverOpen = true;
							setTimeout(() => {
								selectPosition = inputEl.selectionStart ?? -1;
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
								selectPosition = inputEl.selectionStart ?? -1;
							}, 1);
						}}
						placeholder={data.site.searchPlaceholder}
						type="search"
					/>

					{#if sort}
						<input class="hidden" name="sort" value={sort} />
					{/if}

					{#if order}
						<input class="hidden" name="order" value={order} />
					{/if}

					{#if seed}
						<input class="hidden" name="seed" value={seed} />
					{/if}

					<Button
						class="text-muted-foreground focus-within:text-foreground aspect-square h-full rounded p-0 !ring-0 !ring-offset-0"
						type="submit"
						variant="ghost"
					>
						<span class="sr-only">Search</span>
						<Search class="size-5" />
					</Button>
				</form>
			</Popover.Portal>

			<Popover.Content
				align="start"
				class="grid w-fit p-0"
				trapFocus={false}
				onOpenAutoFocus={(e) => {
					e.preventDefault();
					inputEl.focus();
				}}
			>
				{#each filteredTags as tag, i}
					{@const value =
						`${negate ? '-' : ''}${or ? '~' : ''}${tag.namespace}:${tag.name.split(' ').length > 1 ? `"${tag.name}"` : tag.name}`.toLowerCase()}

					<Button
						class={cn('justify-start', i === highligtedIndex && 'underline')}
						onclick={() => {
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

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Button
				class="text-muted-foreground hover:dark:text-primary size-12 rounded-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
				href="/panel"
				onclick={(ev) => ev.preventDefault()}
				variant="ghost"
			>
				<UserCircle class="size-6" />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="min-w-40" preventScroll={false}>
			<DropdownMenu.Group>
				<a href="/preferences">
					<DropdownMenu.Item class="flex w-full cursor-pointer items-center text-neutral-200">
						Preferences
						<Settings class="ms-auto size-4" />
					</DropdownMenu.Item>
				</a>

				{#if data.user}
					<DropdownMenu.Separator />

					<a href="/favorites">
						<DropdownMenu.Item class="flex w-full cursor-pointer items-center text-neutral-200">
							Favorites
							<Heart class="ms-auto size-4" />
						</DropdownMenu.Item>
					</a>

					{#if data.site.enableCollections}
						<a href="/collections">
							<DropdownMenu.Item class="flex w-full cursor-pointer items-center text-neutral-200">
								Collections
								<Bookmark class="ms-auto size-4" />
							</DropdownMenu.Item>
						</a>
					{/if}

					{#if data.site.enableReadHistory}
						<a href="/read-history">
							<DropdownMenu.Item class="flex w-full cursor-pointer items-center text-neutral-200">
								Read history
								<Clock class="ms-auto size-4" />
							</DropdownMenu.Item>
						</a>
					{/if}
				{/if}

				{#if data.user}
					<DropdownMenu.Separator />

					<a href="/account">
						<DropdownMenu.Item class="flex w-full cursor-pointer items-center text-neutral-200">
							Account
							<User class="ms-auto size-[1.125rem]" />
						</DropdownMenu.Item>
					</a>
					<DropdownMenu.Item
						class="flex w-full cursor-pointer items-center text-neutral-200"
						onclick={logout}
					>
						Logout
						<LogOut class="ms-auto size-4" />
					</DropdownMenu.Item>
				{:else if data.site.enableUsers}
					<DropdownMenu.Separator />

					<DropdownMenu.Item
						class="flex w-full cursor-pointer items-center text-neutral-200"
						onclick={showLogin}
					>
						Login
						<LogIn class="ms-auto size-4" />
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>

<div class="flex w-full flex-auto flex-col pt-12">
	{@render children()}
</div>

<Dialog.Root bind:open={loginOpen}>
	<Dialog.Content class="max-w-[90%] md:max-w-md">
		{#if userFormState === 'register'}
			<RegisterForm
				changeState={(state) => (userFormState = state)}
				data={data.registerForm}
				hasMailer={data.site.hasMailer}
				on:result={({ detail }) => handleUserFormResult(detail)}
			/>
		{:else if userFormState === 'recover'}
			<RecoverForm
				changeState={(state) => (userFormState = state)}
				data={data.recoverForm}
				hasMailer={data.site.hasMailer}
				on:result={({ detail }) => handleUserFormResult(detail)}
			/>
		{:else if userFormState === 'reset'}
			<ResetForm
				changeState={(state) => (userFormState = state)}
				data={data.resetForm}
				on:result={({ detail }) => handleUserFormResult(detail)}
			/>
		{:else if userFormState === 'login'}
			<LoginForm
				changeState={(state) => (userFormState = state)}
				data={data.loginForm}
				hasMailer={data.site.hasMailer}
				on:result={({ detail }) => handleUserFormResult(detail)}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>
