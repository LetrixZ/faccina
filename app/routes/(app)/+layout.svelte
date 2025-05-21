<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import * as DropdownMenu from '$lib/components/new/dropdown-menu';
	import IconButton from '$lib/components/newnew/icon-button.svelte';
	import { appState } from '$lib/state.svelte.js';
	import { apiUrl, cn } from '$lib/utils';
	import { Cog, LogOut, UserPlus } from '@lucide/svelte';
	import House from '@lucide/svelte/icons/house';
	import LogIn from '@lucide/svelte/icons/log-in';
	import Menu from '@lucide/svelte/icons/menu';
	import { toast } from 'svelte-sonner';

	const { data, children } = $props();

	let scrollY = $state(0);

	const inputQuery = $derived(decodeURIComponent(page.url.searchParams.get('q') || ''));

	$effect(() => {
		if (appState.preferences.disableLayoutColors) {
			return;
		}

		const currentGallery = appState.currentGallery;
		if (currentGallery) {
			const appColor = appState.colors.get(currentGallery);
			if (appColor) {
				document.documentElement.style.setProperty('--app-color', `${appColor}`);
			} else {
				document.documentElement.style.removeProperty('--app-color');
			}
		} else {
			document.documentElement.style.removeProperty('--app-color');
		}
	});

	const logout = async () => {
		const res = await fetch(`${apiUrl}/api/v1/auth/logout`, { method: 'POST' });

		if (res.ok) {
			invalidateAll();
		} else {
			const { message } = await res.json();
			toast.error(message);
		}
	};
</script>

<svelte:head>
	<title>{data.site.name}</title>
</svelte:head>

<svelte:window bind:scrollY />

<div class="mx-auto flex w-full grow flex-col px-2 pt-16 pb-4 2xl:max-w-8xl">
	<div class="fixed inset-x-0 top-2 z-20 mx-auto flex justify-center px-3 md:px-4">
		<div
			class={cn(
				'search flex h-12 w-full max-w-7xl items-center justify-center gap-0.5 rounded-3xl px-2 py-2 backdrop-blur-md transition-shadow md:gap-2.5 md:px-4',
				scrollY > 36 && 'shadow-muted/50 shadow'
			)}
		>
			<a class="size-8 shrink-0 p-1.5" href="/">
				<House class="size-full" />
			</a>

			<a href="/">
				<IconButton icon={House} />
			</a>

			<form class="size-full" action="/" method="GET">
				<input
					name="q"
					class="size-full rounded-3xl border px-3 text-sm duration-150 outline-none"
					placeholder={data.site.searchPlaceholder}
					type="search"
					value={inputQuery}
				/>
			</form>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<button class="size-8 shrink-0 p-1.5">
						<Menu class="size-full" />
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content
					align="end"
					forceMount
					preventScroll={false}
					side="bottom"
					sideOffset={15}
				>
					<DropdownMenu.Item href="/preferences" icon={Cog} text="Preferences" />

					<DropdownMenu.Separator />

					{#if data.user}
						<DropdownMenu.Item icon={LogOut} onclick={logout} text="Logout" />
					{:else}
						<DropdownMenu.Item
							href="/login?to={page.url.pathname}{page.url.search}"
							icon={LogIn}
							text="Login"
						/>
						<DropdownMenu.Item href="/register" icon={UserPlus} text="Register" />
					{/if}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	{@render children()}
</div>

<style>
	.search {
		background-color: --alpha(
			color-mix(in oklab, var(--app-color), var(--color-background) 85%) / 60%
		);
		transition:
			background-color 300ms,
			shadow 200ms;
	}

	.search input {
		background-color: --alpha(
			color-mix(in oklab, var(--app-color), var(--color-background) 85%) / 60%
		);
		border-color: --alpha(
			color-mix(in oklab, var(--color-neutral-500) 80%, var(--color-accent)) / 40%
		);

		&:focus-visible {
			border-color: --alpha(
				color-mix(in oklab, var(--color-neutral-400) 80%, var(--color-accent)) / 60%
			);
		}
	}
</style>
