<script lang="ts">
	import { Bookmark, Clock, Heart } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import MdiAccount from '~icons/mdi/account';
	import MdiLogin from '~icons/mdi/login';
	import MdiLogout from '~icons/mdi/logout';
	import MdiSettings from '~icons/mdi/settings';

	let { data } = $props();
</script>

<main class="container relative flex flex-col items-center space-y-2 md:w-96">
	<Button
		class="flex w-full items-center justify-between gap-2 text-neutral-200"
		href="/preferences"
		variant="outline"
	>
		Preferences
		<MdiSettings class="size-4" />
	</Button>

	{#if data.user}
		<Separator class="!mb-1 !mt-3" />

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

		{#if data.site.enableCollections}
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

	{#if data.site.enableUsers}
		<Separator class="!mb-1 !mt-3" />

		{#if data.user}
			<Button
				class="flex w-full items-center justify-between gap-2 text-neutral-200"
				href="/account"
				variant="outline"
			>
				Acount
				<MdiAccount class="size-4" />
			</Button>

			<form action="/logout?to=/panel" class="w-full" method="POST">
				<Button
					class="flex w-full items-center justify-between gap-2 text-neutral-200"
					type="submit"
					variant="outline"
				>
					Logout
					<MdiLogout class="size-4" />
				</Button>
			</form>
		{:else}
			<Button
				class="flex w-full items-center justify-between gap-2 text-neutral-200"
				href="/login"
				variant="outline"
			>
				Login
				<MdiLogin class="size-4" />
			</Button>
		{/if}
	{/if}
</main>
