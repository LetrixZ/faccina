<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import Clock from '@lucide/svelte/icons/clock';
	import Heart from '@lucide/svelte/icons/heart';
	import LogIn from '@lucide/svelte/icons/log-in';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Settings from '@lucide/svelte/icons/settings';
	import User from '@lucide/svelte/icons/user';

	const { data } = $props();
</script>

<main class="relative container flex flex-col items-center space-y-2 md:w-96">
	<Button
		class="flex w-full items-center justify-between gap-2 text-neutral-200"
		href="/preferences"
		variant="outline"
	>
		Preferences
		<Settings class="size-4" />
	</Button>

	{#if data.user}
		<Separator class="!mt-3 !mb-1" />

		<Button
			class="flex w-full items-center justify-between gap-2 text-neutral-200"
			href="/favorites"
			variant="outline"
		>
			Favorites
			<Heart class="size-4" />
		</Button>

		{#if data.site.enableCollections}
			<Button
				class="flex w-full items-center justify-between gap-2 text-neutral-200"
				href="/collections"
				variant="outline"
			>
				Collections
				<Bookmark class="size-4" />
			</Button>
		{/if}

		{#if data.site.enableReadHistory}
			<Button
				class="flex w-full items-center justify-between gap-2 text-neutral-200"
				href="/read-history"
				variant="outline"
			>
				Read history
				<Clock class="size-4" />
			</Button>
		{/if}
	{/if}

	{#if data.user}
		<Separator class="!mt-3 !mb-1" />

		<Button
			class="flex w-full items-center justify-between gap-2 text-neutral-200"
			href="/account"
			variant="outline"
		>
			Acount
			<User class="size-4" />
		</Button>

		<form action="/logout?to=/panel" class="w-full" method="POST">
			<Button
				class="iteƒms-center flex w-full justify-between gap-2 text-neutral-200"
				type="submit"
				variant="outline"
			>
				Logout
				<LogOut class="size-4" />
			</Button>
		</form>
	{:else if data.site.enableUsers}
		<Separator class="!mt-3 !mb-1" />

		<Button
			class="flex w-full items-center justify-between gap-2 text-neutral-200"
			href="/login"
			variant="outline"
		>
			Login
			<LogIn class="size-4" />
		</Button>
	{/if}
</main>
