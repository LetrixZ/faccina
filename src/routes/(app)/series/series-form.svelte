<script lang="ts">
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { createSeriesSchema } from '$lib/schemas.js';
	import Save from '@lucide/svelte/icons/save';
	import { superForm } from 'sveltekit-superforms';
	import z from 'zod/v3';

	type Form = ReturnType<typeof superForm<z.infer<typeof createSeriesSchema>>>;

	let {
		form
	}: {
		form: Form;
	} = $props();

	// svelte-ignore state_referenced_locally
	const { form: formData, enhance } = form;
</script>

<form class="flex grow flex-col gap-2" method="POST" use:enhance>
	<Form.Field {form} name="title">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label class="text-xl">Series title</Form.Label>
				<Input {...props} bind:value={$formData.title} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Button class="ms-auto w-fit gap-x-2 bg-green-700 hover:bg-green-700/80" type="submit">
		<Save class="size-5" />
		<span>Save series</span>
	</Form.Button>
</form>
