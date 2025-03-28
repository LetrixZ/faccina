<script lang="ts">
	import { page } from '$app/state';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import type { UserFormState } from '../models';
	import { loginSchema, type LoginSchema } from '../schemas';
	import { Button } from './ui/button';
	import type { ActionResult } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	type Props = {
		data: SuperValidated<Infer<LoginSchema>>;
		hasMailer: boolean;
		changeState?: (state: UserFormState) => void;
		onResult?: (result: ActionResult) => void;
	};

	let { data, hasMailer, changeState, onResult }: Props = $props();

	let form = superForm(data, {
		validators: zodClient(loginSchema),
		onResult: ({ result }) => {
			onResult?.(result);

			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast('Logged in successfully.');
			}
		},
	});

	const { form: formData, enhance } = form;
</script>

<form action="/login{page.url.search}" class="space-y-3" method="POST" use:enhance>
	<div class="flex flex-col">
		<Form.Field {form} name="username">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Username</Form.Label>
					<Input {...props} autocomplete="username" bind:value={$formData.username} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field {form} name="password">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Password</Form.Label>
					<Input
						{...props}
						autocomplete="current-password"
						bind:value={$formData.password}
						type="password"
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	<div class="flex justify-between">
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

		<Button
			class="h-fit p-0 text-sm"
			href={hasMailer ? `/recover${page.url.search}` : `/reset${page.url.search}`}
			onclick={(ev) => {
				if (changeState !== undefined) {
					ev.preventDefault();
					changeState(hasMailer ? 'recover' : 'reset');
				}
			}}
			variant="link"
		>
			Recover access
		</Button>
	</div>

	<Form.Button class="w-full">Login</Form.Button>
</form>
