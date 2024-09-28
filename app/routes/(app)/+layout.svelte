<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';

	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils';
	import IonMdHome from '~icons/ion/md-home';
	import MdiLogin from '~icons/mdi/login';
	import MdiLogout from '~icons/mdi/logout';
	import MdiSettings from '~icons/mdi/settings';
	import PhMagnifyingGlass from '~icons/ph/magnifying-glass';
	import { Heart } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	import type { UserFormState } from '~/lib/models.js';

	import LoginForm from '~/lib/components/login-form.svelte';
	import RecoverForm from '~/lib/components/recover-form.svelte';
	import RegisterForm from '~/lib/components/register-form.svelte';
	import ResetForm from '~/lib/components/reset-form.svelte';
	import { query } from '~/lib/stores.js';

	export let data;
	export let favorites = $page.url.pathname === '/favorites';

	let loginOpen = false;
	let userFormState: UserFormState = 'login';

	let formEl: HTMLFormElement;
	let inputEl: HTMLInputElement;

	$: sort = $page.url.searchParams.get('sort');
	$: order = $page.url.searchParams.get('order');

	$: {
		$query = $page.url.searchParams.get('q') ?? '';
	}

	let selectPosition = -1;
	let highligtedIndex = -1;
	let isFocused = false;
	let popoverOpen = false;
	let negate = false;

	$: filteredTags = $query.trim().length
		? (() => {
				let value = $query.toLowerCase();

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

				negate = value[0] === '-';

				if (negate) {
					value = value.substring(1);
				}

				return data.taxonomies
					.filter(({ name, slug, type }) => {
						return (
							`${type}:${name}`.toLowerCase().includes(value) ||
							`${type}:${slug}`.toLowerCase().includes(value) ||
							`${type}:'${name}'`.toLowerCase().includes(value) ||
							`${type}:'${slug}'`.toLowerCase().includes(value)
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
		let value = $query;

		const currentPosition = input.selectionStart;

		if (currentPosition === null) {
			return;
		}

		let wordEnd = currentPosition;
		let wordStart = currentPosition;

		if ($query[currentPosition - 1] !== ' ') {
			if (wordEnd < $query.length) {
				while ($query[wordEnd] && $query[wordEnd] !== ' ') {
					wordEnd++;
				}
			}

			while ($query[wordStart - 1] && $query[wordStart - 1] !== ' ') {
				wordStart--;
			}
		}

		const tag = filteredTags[index ?? highligtedIndex];

		if (!tag) {
			return;
		}

		let tagValue = `${tag.type}:'${tag.name}' `.toLowerCase();

		if (negate) {
			tagValue = '-' + tagValue;
		}

		value = $query.substring(0, wordStart) + tagValue + $query.substring(wordEnd).trimStart();
		$query = value;

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
</script>

<div class="fixed z-20 flex h-fit w-full border-b bg-background shadow dark:border-border">
	<Button
		class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:dark:text-primary"
		href="/"
		on:click={() => ($query = '')}
		title="Go home"
		variant="ghost"
	>
		<IonMdHome class="size-6" />
	</Button>

	{#if data.site.enableUsers && data.user}
		<Button
			class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:dark:text-primary"
			href="/favorites"
			on:click={() => ($query = '')}
			title="Favorites"
			variant="ghost"
		>
			<Heart class="size-5 fill-current" />
		</Button>
	{/if}

	<div class="h-12 w-full flex-1 p-2">
		<Popover.Root
			disableFocusTrap={true}
			onOpenChange={(open) => (popoverOpen = open)}
			open={!!filteredTags.length && popoverOpen}
			openFocus={inputEl}
			portal={formEl}
		>
			<form
				action={favorites ? '/favorites' : '/'}
				bind:this={formEl}
				class="relative flex h-full w-full items-center rounded-md bg-muted ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
			>
				<Popover.Trigger class="absolute -bottom-3.5 w-full" />
				<Input
					autocomplete="off"
					bind:htmlInput={inputEl}
					bind:value={$query}
					class="h-fit flex-grow border-0 bg-transparent py-2 !ring-0 !ring-offset-0"
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
					placeholder="tag:petite creampie"
					type="search"
				/>

				{#if sort}
					<input class="hidden" name="sort" value={sort} />
				{/if}

				{#if order}
					<input class="hidden" name="order" value={order} />
				{/if}

				<Button
					class="aspect-square h-full rounded-none p-0 text-muted-foreground !ring-0 !ring-offset-0 focus-within:text-foreground"
					type="submit"
					variant="ghost"
				>
					<span class="sr-only">Search</span>
					<PhMagnifyingGlass />
				</Button>
			</form>

			<Popover.Content align="start" class="grid p-0">
				{#each filteredTags as tag, i}
					{@const value = `${tag.type}:'${tag.name}'`.toLowerCase()}

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

	{#if data.site.enableUsers}
		{#if data.user}
			<form
				action="/logout?to={$page.url.pathname}{$page.url.search}"
				method="POST"
				use:enhance={() => {
					return ({ result }) => {
						if (result.type === 'redirect' || result.type === 'success') {
							invalidateAll();
							toast.success('Logged out successfully');
						}
					};
				}}
			>
				<Button
					class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:dark:text-primary"
					title="Logout"
					type="submit"
					variant="ghost"
				>
					<MdiLogout class="size-6" />
				</Button>
			</form>
		{:else}
			<Button
				class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:dark:text-primary"
				href="/login?to={$page.url.pathname}{$page.url.search}"
				on:click={(ev) => {
					ev.preventDefault();
					userFormState = 'login';
					loginOpen = true;
				}}
				title="Login"
				variant="ghost"
			>
				<MdiLogin class="size-6" />
			</Button>
		{/if}
	{/if}

	<Button
		class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:dark:text-primary"
		href="/preferences"
		title="Preferences"
		variant="ghost"
	>
		<MdiSettings class="size-6" />
	</Button>
</div>

<div class={cn('pt-12')}>
	<slot />
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
