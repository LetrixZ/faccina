<script lang="ts">
	import { page } from '$app/stores';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { UserFormState } from '../models';
	import { resetSchema, type ResetSchema } from '../schemas';
	import { Button } from './ui/button';
	import type { ActionResult } from '@sveltejs/kit';

	export let data: SuperValidated<Infer<ResetSchema>>;
	export let changeState: ((state: UserFormState) => void) | undefined = undefined;

	const dispatch = createEventDispatcher<{ result: ActionResult }>();

	let form = superForm(data, {
		validators: zodClient(resetSchema),
		invalidateAll: false,
		onResult: ({ result }) => {
			dispatch('result', result);

			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Password reset successful.');
			}
		},
	});

	const { form: formData, enhance: enhance } = form;
</script>

<form class="flex flex-col space-y-3" action="/reset{$page.url.search}" method="POST" use:enhance>
	<div class="flex flex-col">
		<Form.Field name="password" {form}>
			<Form.Control let:attrs>
				<Form.Label>New Password</Form.Label>
				<Input
					{...attrs}
					autocomplete="new-password"
					type="password"
					bind:value={$formData.password}
				/>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field name="confirmPassword" {form}>
			<Form.Control let:attrs>
				<Form.Label>Confirm Password</Form.Label>
				<Input
					{...attrs}
					autocomplete="new-password"
					type="password"
					bind:value={$formData.confirmPassword}
				/>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field name="code" {form}>
			<Form.Control let:attrs>
				<Form.Label>Recovery code</Form.Label>
				<Input {...attrs} bind:value={$formData.code} />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	<div class="flex justify-between">
		<Button
			class="h-fit p-0 text-sm"
			href="/login{$page.url.search}"
			variant="link"
			on:click={(ev) => {
				if (changeState && typeof changeState == 'function') {
					ev.preventDefault();
					changeState('login');
				}
			}}
		>
			Login
		</Button>
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
	</div>

	<Form.Button class="w-full">Reset Password</Form.Button>

	<Button
		class="mx-auto"
		href="/recover{$page.url.search}"
		variant="link"
		on:click={(ev) => {
			if (changeState && typeof changeState == 'function') {
				ev.preventDefault();
				changeState('recover');
			}
		}}
	>
		I don't have a recovery code
	</Button>
</form>
