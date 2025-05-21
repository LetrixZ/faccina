<script lang="ts">
	import { page } from '$app/state';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { UserFormState } from '../models';
	import { resetSchema, type ResetSchema } from '../schemas';
	import { Button } from './ui/button';
	import type { ActionResult } from '@sveltejs/kit';

	type Props = {
		data: SuperValidated<Infer<ResetSchema>>;
		changeState?: (state: UserFormState) => void;
		onResult?: (result: ActionResult) => void;
	};

	let { data, changeState, onResult }: Props = $props();

	let form = superForm(data, {
		validators: zodClient(resetSchema),
		invalidateAll: false,
		onResult: ({ result }) => {
			onResult?.(result);

			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Password reset successful.');
			}
		},
	});

	const { form: formData, enhance: enhance } = form;
</script>

<form class="flex flex-col space-y-3" action="/reset{page.url.search}" method="POST" use:enhance>
	<div class="flex flex-col">
		<Form.Field name="password" {form}>
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>New Password</Form.Label>
					<Input
						{...props}
						autocomplete="new-password"
						type="password"
						bind:value={$formData.password}
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field name="confirmPassword" {form}>
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Confirm Password</Form.Label>
					<Input
						{...props}
						autocomplete="new-password"
						type="password"
						bind:value={$formData.confirmPassword}
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field name="code" {form}>
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
				if (changeState !== undefined) {
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
				if (changeState !== undefined) {
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
			if (changeState !== undefined) {
				ev.preventDefault();
				changeState('recover');
			}
		}}
		variant="link"
	>
		I don't have a recovery code
	</Button>
</form>
