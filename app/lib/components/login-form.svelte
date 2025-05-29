<script lang="ts">
	import { page } from '$app/stores';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { UserFormState } from '../models';
	import { loginSchema, type LoginSchema } from '../schemas';
	import { Button } from './ui/button';
	import type { ActionResult } from '@sveltejs/kit';

	export let data: SuperValidated<Infer<LoginSchema>>;
	export let changeState: ((state: UserFormState) => void) | undefined = undefined;
	export let hasMailer: boolean;

	const dispatch = createEventDispatcher<{ result: ActionResult }>();

	let form = superForm(data, {
		validators: zodClient(loginSchema),
		onResult: ({ result }) => {
			dispatch('result', result);

			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast('Logged in successfully.');
			}
		},
	});

	const { form: formData, enhance } = form;
</script>

<form class="space-y-3" action="/login{$page.url.search}" method="POST" use:enhance>
	<div class="flex flex-col">
		<Form.Field name="username" {form}>
			<Form.Control let:attrs>
				<Form.Label>Username</Form.Label>
				<Input {...attrs} autocomplete="username" bind:value={$formData.username} />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field name="password" {form}>
			<Form.Control let:attrs>
				<Form.Label>Password</Form.Label>
				<Input
					{...attrs}
					autocomplete="current-password"
					type="password"
					bind:value={$formData.password}
				/>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	<div class="flex justify-between">
		<Button
			class="h-fit p-0 text-sm"
			href="/register{$page.url.search}"
			variant="link"
			on:click={(ev) => {
				if (changeState && typeof changeState == 'function') {
					ev.preventDefault();
					changeState('register');
				}
			}}
		>
			Create an account
		</Button>

		<Button
			class="h-fit p-0 text-sm"
			href={hasMailer ? `/recover${$page.url.search}` : `/reset${$page.url.search}`}
			variant="link"
			on:click={(ev) => {
				if (changeState && typeof changeState == 'function') {
					ev.preventDefault();
					changeState(hasMailer ? 'recover' : 'reset');
				}
			}}
		>
			Recover access
		</Button>
	</div>

	<Form.Button class="w-full">Login</Form.Button>
</form>
