<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Link from '$lib/components/new/link.svelte';
	import TextInput from '$lib/components/new/text-input.svelte';
	import Button from '$lib/components/newnew/button.svelte';
	import { apiUrl } from '$lib/utils';
	import { toast } from 'svelte-sonner';

	const { data } = $props();

	let username = $state('');
	let password = $state('');

	const login = async () => {
		const params = new URLSearchParams();
		params.set('username', username);
		params.set('password', password);

		const res = await fetch(`${apiUrl}/internal/app/login`, {
			method: 'POST',
			body: params,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		});

		if (res.ok) {
			await invalidateAll();
			toast(`Logged in as ${username}`);
			goto(page.url.searchParams.get('to') ?? '/');
		} else {
			const { message } = await res.json();
			toast.error(message);
		}
	};

	const logout = async () => {
		const res = await fetch(`${apiUrl}/api/v1/auth/logout`, { method: 'POST' });

		if (res.ok) {
			toast('Logged out');
			invalidateAll();
		} else {
			const { message } = await res.json();
			toast.error(message);
		}
	};
</script>

<div class="mx-auto flex w-full flex-col md:max-w-sm">
	{#if data.user}
		<div class="flex flex-col items-center gap-2 py-4">
			<p class="text-sm">
				You're already logged in as <span class="font-medium">{data.user.username}</span>
			</p>

			<Button class="w-full" onclick={logout} type="submit">Logout</Button>
		</div>
	{:else}
		<form
			class="flex flex-col gap-2"
			onsubmit={(ev) => {
				ev.preventDefault();
				login();
			}}
		>
			<TextInput bind:value={username}>Username</TextInput>
			<TextInput type="password" bind:value={password}>Password</TextInput>

			<div class="mt-2 flex flex-col gap-2">
				<div class="flex justify-between">
					<Link href="/register">Create an account</Link>
					<Link href="/recover">Recover access</Link>
				</div>

				<Button centered type="submit">Login</Button>
			</div>
		</form>
	{/if}
</div>
