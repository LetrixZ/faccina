<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { appState } from '$lib/app.svelte.js';
	import LoginForm from '$lib/components/login-form.svelte';
	import RecoverForm from '$lib/components/recover-form.svelte';
	import RegisterForm from '$lib/components/register-form.svelte';
	import ResetForm from '$lib/components/reset-form.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import type { UserFormState } from '$lib/models';
	import type { Tag } from '$lib/types.js';
	import { cn } from '$lib/utils.js';
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

	let { data, children } = $props();

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

	let loginOpen = $state(false);
	let userFormState: UserFormState = $state('login');

	let formEl: HTMLFormElement | null = $state(null);
	let inputEl: HTMLInputElement | null = $state(null);

	const sort = $derived(page.url.searchParams.get('sort'));
	const order = $derived(page.url.searchParams.get('order'));
	const seed = $derived(page.url.searchParams.get('seed'));

	const shouldAutocomplete = $state(true);

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
		let value = appState.query.trim().toLowerCase();
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

		const tagMap = new Map<string, Tag>();

		data.tagList
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
	});

	$effect(() => {
		if (!isFocused) {
			highligtedIndex = -1;
		}
	});

	$effect(() => {
		appState.query = page.url.searchParams.get('q') ?? '';
	});

	const insertTag = async (input: HTMLInputElement, index?: number) => {
		const currentPosition = input.selectionStart;

		if (currentPosition === null) {
			return;
		}

		let wordEnd = currentPosition;
		let wordStart = currentPosition;

		if (appState.query[currentPosition - 1] !== ' ') {
			if (wordEnd < appState.query.length) {
				while (appState.query[wordEnd] && appState.query[wordEnd] !== ' ') {
					wordEnd++;
				}
			}

			while (appState.query[wordStart - 1] && appState.query[wordStart - 1] !== ' ') {
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

		appState.query =
			appState.query.substring(0, wordStart) +
			tagValue +
			appState.query.substring(wordEnd).trimStart();

		highligtedIndex = -1;
		popoverOpen = false;

		setTimeout(() => {
			inputEl?.setSelectionRange(wordStart + tagValue.length, wordStart + tagValue.length);
		}, 1);
	};

	const handleUserFormResult = (result: ActionResult) => {
		if (result.type === 'success' || result.type === 'redirect') {
			loginOpen = false;
		}
	};

	const logout = () => {
		fetch(`/logout`, {
			method: 'POST'
		}).then(() => invalidateAll());
	};

	const showLogin = () => {
		userFormState = 'login';
		loginOpen = true;
	};
</script>

<div class="fixed z-9999 flex h-fit w-full border-b bg-background shadow border-border">
	<Button
		class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:text-primary"
		href="/"
		onclick={() => (appState.query = '')}
		title="Go home"
		variant="ghost"
	>
		<Home class="size-6" />
	</Button>

	<Button
		class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:text-primary"
		href="/series"
		onclick={() => (appState.query = '')}
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
			<form
				action={formAction}
				bind:this={formEl}
				class="relative flex h-full w-full items-center rounded-md bg-muted ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
				onsubmit={() => {
					popoverOpen = false;
				}}
			>
				<Popover.Trigger class="absolute -bottom-3.5 w-full" />
				<Input
					autocomplete="off"
					bind:ref={inputEl}
					bind:value={appState.query}
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
				class="grid w-fit p-0 gap-0"
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
						class={cn(
							'justify-start ring-offset-0! ring-0! focus-visible:underline',
							i === highligtedIndex && 'underline'
						)}
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

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Button
				class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:text-primary"
				href="/panel"
				onclick={(ev) => ev.preventDefault()}
				variant="ghost"
			>
				<UserCircle class="size-6" />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="min-w-40" preventScroll={false}>
			<DropdownMenu.Group>
				<DropdownMenu.Item class="flex w-full cursor-pointer items-center text-neutral-200">
					{#snippet child({ props })}
						<a {...props} href="/preferences">
							Preferences
							<Settings class="ms-auto size-4" />
						</a>
					{/snippet}
				</DropdownMenu.Item>

				{#if data.user}
					<DropdownMenu.Separator />

					<DropdownMenu.Item class="flex w-full cursor-pointer items-center text-neutral-200">
						{#snippet child({ props })}
							<a {...props} href="/favorites">
								Favorites
								<Heart class="ms-auto size-4" />
							</a>
						{/snippet}
					</DropdownMenu.Item>

					{#if data.site.enableCollections}
						<DropdownMenu.Item class="flex w-full cursor-pointer items-center text-neutral-200">
							{#snippet child({ props })}
								<a {...props} href="/collections">
									Collections
									<Bookmark class="ms-auto size-4" />
								</a>
							{/snippet}
						</DropdownMenu.Item>
					{/if}

					{#if data.site.enableReadHistory}
						<DropdownMenu.Item class="flex w-full cursor-pointer items-center text-neutral-200">
							{#snippet child({ props })}
								<a {...props} href="/read-history">
									Read history
									<Clock class="ms-auto size-4" />
								</a>
							{/snippet}
						</DropdownMenu.Item>
					{/if}
				{/if}

				{#if data.user}
					<DropdownMenu.Separator />

					<DropdownMenu.Item class="flex w-full cursor-pointer items-center text-neutral-200">
						{#snippet child({ props })}
							<a {...props} href="/account">
								Account
								<User class="ms-auto size-4.5" />
							</a>
						{/snippet}
					</DropdownMenu.Item>

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
	{@render children?.()}
</div>

<Dialog.Root bind:open={loginOpen}>
	<Dialog.Content class="max-w-[90%] md:max-w-md">
		{#if userFormState === 'register'}
			<RegisterForm
				changeState={(state) => (userFormState = state)}
				form={data.registerForm}
				hasMailer={data.site.hasMailer}
				onResult={handleUserFormResult}
			/>
		{:else if userFormState === 'recover'}
			<RecoverForm
				changeState={(state) => (userFormState = state)}
				form={data.recoverForm}
				hasMailer={data.site.hasMailer}
				onResult={handleUserFormResult}
			/>
		{:else if userFormState === 'reset'}
			<ResetForm
				changeState={(state) => (userFormState = state)}
				form={data.resetForm}
				onResult={handleUserFormResult}
			/>
		{:else if userFormState === 'login'}
			<LoginForm
				changeState={(state) => (userFormState = state)}
				form={data.loginForm}
				hasMailer={data.site.hasMailer}
				onResult={handleUserFormResult}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>
