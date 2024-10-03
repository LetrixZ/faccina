<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';

	import { Save } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	import type { TaxonomyItem } from '../models';

	import { editTaxonomySchema, type EditTaxonomySchema } from '../schemas';
	import InputChip from './input-chip.svelte';
	import { Button } from './ui/button';
	import { Label } from './ui/label';
	import { Separator } from './ui/separator';

	export let data: SuperValidated<Infer<EditTaxonomySchema>>;
	export let taxonomies: TaxonomyItem[];

	const dispatch = createEventDispatcher<{ result: ActionResult; close: void }>();

	let form = superForm(data, {
		validators: zodClient(editTaxonomySchema),
		dataType: 'json',
		onResult: ({ result }) => {
			dispatch('result', result);

			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Changes saved successfully.');
			}
		},
	});

	const { form: formData, enhance } = form;
</script>

<form
	action="?/editTaxonomy"
	class="space-y-4"
	method="POST"
	on:submit={(ev) => ev.preventDefault()}
	use:enhance
>
	<div class="flex flex-col">
		<button aria-hidden="true" class="hidden" disabled type="submit"></button>
		<input class="invisible h-0" />

		<div class="space-y-1.5">
			<Label for="artists">Artists</Label>
			<InputChip
				chips={$formData.artists}
				id="artists"
				on:update={(ev) => ($formData.artists = ev.detail)}
				tags={taxonomies.filter((tag) => tag.type === 'artist').map((tag) => tag.name)}
			/>
		</div>
	</div>

	<div class="space-y-1.5">
		<Label for="circles">Circles</Label>
		<InputChip
			chips={$formData.circles}
			id="circles"
			on:update={(ev) => ($formData.circles = ev.detail)}
			tags={taxonomies.filter((tag) => tag.type === 'circle').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="magazines">Magazines</Label>
		<InputChip
			chips={$formData.magazines}
			id="magazines"
			on:update={(ev) => ($formData.magazines = ev.detail)}
			tags={taxonomies.filter((tag) => tag.type === 'magazine').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="events">Events</Label>
		<InputChip
			chips={$formData.events}
			id="events"
			on:update={(ev) => ($formData.events = ev.detail)}
			tags={taxonomies.filter((tag) => tag.type === 'event').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="publishers">Publishers</Label>
		<InputChip
			chips={$formData.publishers}
			id="publishers"
			on:update={(ev) => ($formData.publishers = ev.detail)}
			tags={taxonomies.filter((tag) => tag.type === 'publisher').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="parodies">Parodies</Label>
		<InputChip
			chips={$formData.parodies}
			id="parodies"
			on:update={(ev) => ($formData.parodies = ev.detail)}
			tags={taxonomies.filter((tag) => tag.type === 'parody').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="parodies">Tags</Label>
		<InputChip
			chips={$formData.tags}
			id="tags"
			on:update={(ev) => ($formData.tags = ev.detail)}
			tags={taxonomies.filter((tag) => tag.type === 'tag').map((tag) => tag.name)}
		/>
	</div>

	<Separator />

	<div class="flex justify-between">
		<Button on:click={() => dispatch('close')} variant="outline">Discard changes</Button>
		<Button class="gap-x-2 bg-green-700 hover:bg-green-700/80" on:click={() => form.submit()}>
			<Save class="size-5" />
			<span>Save changes</span>
		</Button>
	</div>
</form>
