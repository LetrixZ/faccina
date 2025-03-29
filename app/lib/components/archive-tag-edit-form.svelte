<script lang="ts">
	import { appState } from '$lib/stores.svelte';
	import { editTagsSchema, type EditTagsSchema } from '../schemas';
	import type { TagNamespace } from '../types';
	import { isTag } from '../utils';
	import InputChip from './input-chip.svelte';
	import { Button } from './ui/button';
	import { Label } from './ui/label';
	import { Separator } from './ui/separator';
	import Save from '@lucide/svelte/icons/save';
	import type { ActionResult } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	type Props = {
		data: SuperValidated<Infer<EditTagsSchema>>;
		onResult?: (result: ActionResult) => void;
		onClose?: () => void;
	};

	let { data, onResult, onClose }: Props = $props();

	let form = superForm(data, {
		validators: zodClient(editTagsSchema),
		dataType: 'json',
		onResult: ({ result }) => {
			onResult?.(result);

			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Changes saved successfully.');
			}
		},
	});

	const { form: formData, enhance } = form;

	const artists = $derived(
		$formData.tags.filter((tag) => tag.namespace === 'artist').map((tag) => tag.name)
	);
	const circles = $derived(
		$formData.tags.filter((tag) => tag.namespace === 'circle').map((tag) => tag.name)
	);
	const magazines = $derived(
		$formData.tags.filter((tag) => tag.namespace === 'magazine').map((tag) => tag.name)
	);
	const events = $derived(
		$formData.tags.filter((tag) => tag.namespace === 'event').map((tag) => tag.name)
	);
	const publishers = $derived(
		$formData.tags.filter((tag) => tag.namespace === 'publisher').map((tag) => tag.name)
	);
	const parodies = $derived(
		$formData.tags.filter((tag) => tag.namespace === 'parody').map((tag) => tag.name)
	);
	const tags = $derived(
		$formData.tags
			.filter(isTag)
			.map((tag) => (tag.namespace === 'tag' ? tag.name : `${tag.namespace}:${tag.name}`))
	);

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

							if (!namespace?.length) {
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
	onsubmit={(ev) => ev.preventDefault()}
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
				onUpdate={(tags) => updateTags('artist', tags)}
				tags={appState.tagList.filter((tag) => tag.namespace === 'artist').map((tag) => tag.name)}
			/>
		</div>
	</div>

	<div class="space-y-1.5">
		<Label for="circles">Circles</Label>
		<InputChip
			chips={circles}
			id="circles"
			onUpdate={(tags) => updateTags('circle', tags)}
			tags={appState.tagList.filter((tag) => tag.namespace === 'circle').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="magazines">Magazines</Label>
		<InputChip
			chips={magazines}
			id="magazines"
			onUpdate={(tags) => updateTags('magazine', tags)}
			tags={appState.tagList.filter((tag) => tag.namespace === 'magazine').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="events">Events</Label>
		<InputChip
			chips={events}
			id="events"
			onUpdate={(tags) => updateTags('event', tags)}
			tags={appState.tagList.filter((tag) => tag.namespace === 'event').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="publishers">Publishers</Label>
		<InputChip
			chips={publishers}
			id="publishers"
			onUpdate={(tags) => updateTags('publisher', tags)}
			tags={appState.tagList.filter((tag) => tag.namespace === 'publishers').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="parodies">Parodies</Label>
		<InputChip
			chips={parodies}
			id="parodies"
			onUpdate={(tags) => updateTags('parody', tags)}
			tags={appState.tagList.filter((tag) => tag.namespace === 'parody').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="tags">Tags</Label>
		<InputChip
			chips={tags}
			id="tags"
			onUpdate={(tags) => updateTags('tag', tags)}
			tags={appState.tagList.filter(isTag).map((tag) => tag.name)}
		/>
	</div>

	<Separator />

	<div class="flex justify-between">
		<Button onclick={() => onClose?.()} variant="outline">Discard changes</Button>
		<Button class="gap-x-2 bg-green-700 hover:bg-green-700/80" onclick={() => form.submit()}>
			<Save class="size-5" />
			<span>Save changes</span>
		</Button>
	</div>
</form>
