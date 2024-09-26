<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';

	import { page } from '$app/stores';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	import type { UserFormState } from '../models';

	import { recoverSchema, type RecoverSchema } from '../schemas';
	import { Button } from './ui/button';

	export let data: SuperValidated<Infer<RecoverSchema>>;
	export let changeState: ((state: UserFormState) => void) | undefined = undefined;

	const dispatch = createEventDispatcher<{ result: ActionResult }>();

	let form = superForm(data, {
		validators: zodClient(recoverSchema),
		onResult: ({ result }) => {
			dispatch('result', result);

			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.info('An email will be sent if the user is found.');
			}
		},
	});

	const { form: formData, enhance } = form;
</script>

<form action="/recover{$page.url.search}" class="space-y-3" method="POST" use:enhance>
	<div class="flex flex-col">
		<Form.Field {form} name="username">
			<Form.Control let:attrs>
				<Form.Label>Username</Form.Label>
				<Input {...attrs} bind:value={$formData.username} />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	<div class="flex justify-between">
		<Button
			class="h-fit p-0 text-sm"
			href="/login{$page.url.search}"
			on:click={(ev) => {
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
			href="/register{$page.url.search}"
			on:click={(ev) => {
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

	<Form.Button class="w-full">Recover</Form.Button>
</form>
