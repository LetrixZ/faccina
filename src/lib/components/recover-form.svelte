<script lang="ts">
	import { page } from '$app/state';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input';
	import type { UserFormState } from '../models.js';
	import { recoverSchema, type RecoverSchema } from '../schemas.js';
	import { Button } from './ui/button/index.js';
	import type { ActionResult } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	let {
		form: initialForm,
		hasMailer,
		changeState = undefined,
		onResult
	}: {
		form: SuperValidated<Infer<RecoverSchema>>;
		hasMailer: boolean;
		changeState?: (state: UserFormState) => void;
		onResult?: (value: ActionResult) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let form = superForm(initialForm, {
		validators: zodClient(recoverSchema),
		onResult: ({ result }) => {
			onResult?.(result);

			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.info('An email with a recovery code will be sent if the user is found.');
			}
		}
	});

	const { form: formData, enhance } = form;
</script>

<form action="/recover{page.url.search}" class="flex flex-col space-y-3" method="POST" use:enhance>
	{#if hasMailer}
		<div class="flex flex-col">
			<Form.Field {form} name="username">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Username</Form.Label>
						<Input {...props} bind:value={$formData.username} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</div>
	{:else}
		<p class="rounded border border-primary p-4 text-center text-sm">
			The site can't send emails.<br />Make a request to the admin for a recovery code.
		</p>
	{/if}

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

	<Form.Button class="w-full" disabled={!hasMailer}>Recover</Form.Button>

	<Button
		class="mx-auto"
		href="/reset{page.url.search}"
		onclick={(ev) => {
			if (changeState && typeof changeState == 'function') {
				ev.preventDefault();
				changeState('reset');
			}
		}}
		variant="link"
	>
		I already have a recovery code
	</Button>
</form>
