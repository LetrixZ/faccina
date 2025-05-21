<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import Input from '$lib/components/ui/input/input.svelte';
	import { type CreateSeriesSchema } from '$lib/schemas.js';
	import Save from '@lucide/svelte/icons/save';
	import { type SuperForm } from 'sveltekit-superforms';
	import type { z } from 'zod';

	type Props = {
		form: SuperForm<z.infer<CreateSeriesSchema>, unknown>;
	};

	let { form }: Props = $props();

	const { form: formData, enhance } = form;
</script>

<form class="flex flex-grow flex-col gap-2" method="POST" use:enhance>
	<Form.Field name="title" {form}>
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
