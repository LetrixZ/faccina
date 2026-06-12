<script lang="ts">
	import { page } from '$app/state';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { UserFormState } from '../models.js';
	import { resetSchema, type ResetSchema } from '../schemas.js';
	import { Button } from './ui/button/index.js';
	import type { ActionResult } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	let {
		form: initialForm,
		changeState = undefined,
		onResult
	}: {
		form: SuperValidated<Infer<ResetSchema>>;
		changeState?: (state: UserFormState) => void;
		onResult: (value: ActionResult) => void;
	} = $props();

	let form = superForm(initialForm, {
		validators: zodClient(resetSchema),
		invalidateAll: false,
		onResult: ({ result }) => {
			onResult(result);

			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Password reset successful.');
			}
		}
	});

	const { form: formData, enhance: enhance } = form;
</script>

<form action="/reset{page.url.search}" class="flex flex-col space-y-3" method="POST" use:enhance>
	<div class="flex flex-col">
		<Form.Field {form} name="password">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>New Password</Form.Label>
					<Input
						{...props}
						autocomplete="new-password"
						bind:value={$formData.password}
						type="password"
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field {form} name="confirmPassword">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Confirm Password</Form.Label>
					<Input
						{...props}
						autocomplete="new-password"
						bind:value={$formData.confirmPassword}
						type="password"
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field {form} name="code">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Recovery code</Form.Label>
					<Input {...props} bind:value={$formData.code} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	<div class="flex justify-between">
		<Button
			class="h-fit p-0 text-sm"
			href="/login{page.url.search}"
			onclick={(ev) => {
				if (changeState && typeof changeState == 'function') {
					ev.preventDefault();
					changeState('login');
				}
			}}
			variant="link"
		>
			Login
		</Button>
		<Button
			class="h-fit p-0 text-sm"
			href="/register{page.url.search}"
			onclick={(ev) => {
				if (changeState && typeof changeState == 'function') {
					ev.preventDefault();
					changeState('register');
				}
			}}
			variant="link"
		>
			Create an account
		</Button>
	</div>

	<Form.Button class="w-full">Reset Password</Form.Button>

	<Button
		class="mx-auto"
		href="/recover{page.url.search}"
		onclick={(ev) => {
			if (changeState && typeof changeState == 'function') {
				ev.preventDefault();
				changeState('recover');
			}
		}}
		variant="link"
	>
		I don't have a recovery code
	</Button>
</form>
