<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import Save from 'lucide-svelte/icons/save';
	import { createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { TagNamespace } from '../types';
	import { editTagsSchema, type EditTagsSchema } from '../schemas';
	import { isTag } from '../utils';
	import InputChip from './input-chip.svelte';
	import { Button } from './ui/button';
	import { Label } from './ui/label';
	import { Separator } from './ui/separator';
	import { tagList } from '$lib/stores';

	export let data: SuperValidated<Infer<EditTagsSchema>>;

	const dispatch = createEventDispatcher<{ result: ActionResult; close: void }>();

	let form = superForm(data, {
		validators: zodClient(editTagsSchema),
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

	$: artists = $formData.tags.filter((tag) => tag.namespace === 'artist').map((tag) => tag.name);
	$: circles = $formData.tags.filter((tag) => tag.namespace === 'circle').map((tag) => tag.name);
	$: magazines = $formData.tags
		.filter((tag) => tag.namespace === 'magazine')
		.map((tag) => tag.name);
	$: events = $formData.tags.filter((tag) => tag.namespace === 'event').map((tag) => tag.name);
	$: publishers = $formData.tags
		.filter((tag) => tag.namespace === 'publisher')
		.map((tag) => tag.name);
	$: parodies = $formData.tags.filter((tag) => tag.namespace === 'parody').map((tag) => tag.name);
	$: tags = $formData.tags
		.filter(isTag)
		.map((tag) => (tag.namespace === 'tag' ? tag.name : `${tag.namespace}:${tag.name}`));

	const updateTags = (namespace: TagNamespace, tags: string[]) => {
		switch (namespace) {
			case 'artist':
			case 'circle':
			case 'magazine':
			case 'event':
			case 'publisher':
			case 'parody': {
				let aux = $formData.tags;
				aux = aux.filter((tag) => tag.namespace !== namespace);
				aux = [...aux, ...tags.map((tag) => ({ namespace, name: tag }))];
				$formData.tags = aux;

				break;
			}
			default: {
				let aux = $formData.tags;
				aux = aux.filter((tag) => !isTag(tag));
				aux = [
					...aux,
					...tags.map((tag) => {
						if (tag.split(':').length >= 2) {
							const namespace = tag.split(':')[0];

							if (!namespace.length) {
								return {
									namespace: 'tag',
									name: tag,
								};
							}

							const name = tag.split(':').slice(1).join(':');

							return {
								namespace,
								name,
							};
						} else {
							return {
								namespace: 'tag',
								name: tag,
							};
						}
					}),
				];
				$formData.tags = aux;

				break;
			}
		}
	};
</script>

<form
	action="?/editTags"
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
				chips={artists}
				id="artists"
				on:update={(ev) => updateTags('artist', ev.detail)}
				tags={$tagList.filter((tag) => tag.namespace === 'artist').map((tag) => tag.name)}
			/>
		</div>
	</div>

	<div class="space-y-1.5">
		<Label for="circles">Circles</Label>
		<InputChip
			chips={circles}
			id="circles"
			on:update={(ev) => updateTags('circle', ev.detail)}
			tags={$tagList.filter((tag) => tag.namespace === 'circle').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="magazines">Magazines</Label>
		<InputChip
			chips={magazines}
			id="magazines"
			on:update={(ev) => updateTags('magazine', ev.detail)}
			tags={$tagList.filter((tag) => tag.namespace === 'magazine').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="events">Events</Label>
		<InputChip
			chips={events}
			id="events"
			on:update={(ev) => updateTags('event', ev.detail)}
			tags={$tagList.filter((tag) => tag.namespace === 'event').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="publishers">Publishers</Label>
		<InputChip
			chips={publishers}
			id="publishers"
			on:update={(ev) => updateTags('publisher', ev.detail)}
			tags={$tagList.filter((tag) => tag.namespace === 'publishers').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="parodies">Parodies</Label>
		<InputChip
			chips={parodies}
			id="parodies"
			on:update={(ev) => updateTags('parody', ev.detail)}
			tags={$tagList.filter((tag) => tag.namespace === 'parody').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="tags">Tags</Label>
		<InputChip
			chips={tags}
			id="tags"
			on:update={(ev) => updateTags('tag', ev.detail)}
			tags={$tagList.filter(isTag).map((tag) => tag.name)}
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
