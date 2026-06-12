<script lang="ts">
	import Save from 'lucide-svelte/icons/save';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { userDeleteSchema, userEditSchema } from '$lib/schemas';

	export let data;

	let deleteOpen = false;
	let showPasswordInput = false;

	let form = superForm(data.userForm, {
		dataType: 'json',
		validators: zodClient(userEditSchema),
		resetForm: false,
		onResult: ({ result }) => {
			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Account edited successfully.');
			}
		},
	});

	const { form: formData, enhance } = form;

	let deleteForm = superForm(data.deleteForm, {
		validators: zodClient(userDeleteSchema),
		onResult: ({ result }) => {
			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Account deleted successfully.');
			}
		},
	});

	const { form: deleteFormData, enhance: deleteEnhance } = deleteForm;
</script>

<main class="container relative flex max-w-screen-md flex-col gap-y-2">
	<form class="flex flex-col gap-3" method="POST" use:enhance>
		<input autocomplete="username" bind:value={$formData.username} class="hidden" />

		<div class="space-y-3">
			<Form.Field {form} name="email">
				<Form.Control let:attrs>
					<Form.Label>
						Email <span class="text-sm font-normal text-neutral-500">(optional)</span>
					</Form.Label>
					<Input {...attrs} autocomplete="email" bind:value={$formData.email} type="email" />
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Separator />

			<p class="font-medium">Change password</p>

			<Form.Field {form} name="currentPassword">
				<Form.Control let:attrs>
					<Form.Label>Current password</Form.Label>
					<Input
						{...attrs}
						autocomplete="current-password"
						bind:value={$formData.currentPassword}
						type="password"
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<div class="grid gap-3 sm:grid-cols-2">
				<Form.Field {form} name="newPassword">
					<Form.Control let:attrs>
						<Form.Label>New password</Form.Label>
						<Input
							{...attrs}
							autocomplete="new-password"
							bind:value={$formData.newPassword}
							type="password"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="confirmNewPassword">
					<Form.Control let:attrs>
						<Form.Label>Confirm new password</Form.Label>
						<Input
							{...attrs}
							autocomplete="new-password"
							bind:value={$formData.confirmNewPassword}
							type="password"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>
		</div>

		<Separator />

		<div class="flex w-full justify-between gap-2 max-sm:flex-col">
			<Button class="w-full space-x-2 bg-green-700 hover:bg-green-700/80 sm:w-fit" type="submit">
				<Save class="size-5" />
				<span>Save changes</span>
			</Button>

			<Button
				href="/account/delete"
				on:click={(ev) => {
					ev.preventDefault();
					deleteOpen = true;
				}}
				variant="link"
			>
				Delete your account
			</Button>
		</div>
	</form>
</main>

<AlertDialog.Root onOpenChange={(open) => (deleteOpen = open)} open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Are you sure?</AlertDialog.Title>
			<AlertDialog.Description>
				This action cannot be undone. This will permanently delete your account alongside your
				collections and read history.
			</AlertDialog.Description>
		</AlertDialog.Header>

		{#if showPasswordInput}
			<form action="/account/delete" method="POST" use:deleteEnhance>
				<Form.Field form={deleteForm} name="currentPassword">
					<Form.Control let:attrs>
						<Form.Label>Current password</Form.Label>
						<Input
							{...attrs}
							autocomplete="current-password"
							bind:value={$deleteFormData.currentPassword}
							type="password"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</form>
		{/if}

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action asChild>
				<Button
					on:click={() => {
						if (showPasswordInput) {
							deleteForm.submit();
						} else {
							showPasswordInput = true;
						}
					}}
					variant="destructive"
				>
					{#if showPasswordInput}
						Delete
					{:else}
						Continue
					{/if}
				</Button>
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
