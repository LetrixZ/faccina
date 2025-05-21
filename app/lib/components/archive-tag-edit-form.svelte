<script lang="ts">
	import Save from '@lucide/svelte/icons/save';
	import { toast } from 'svelte-sonner';
	import { type Infer, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { Tag, TagNamespace } from '../types';
	import { editTagsSchema, type EditTagsSchema } from '../schemas';
	import { isTag } from '../utils';
	import InputChip from './input-chip.svelte';
	import { Button } from './ui/button';
	import { Label } from './ui/label';
	import { Separator } from './ui/separator';
	import type { ActionResult } from '@sveltejs/kit';

	type Props = {
		data: SuperValidated<Infer<EditTagsSchema>>;
		onResult?: (result: ActionResult) => void;
		onClose?: () => void;
		tagList: Tag[];
	};

	let { data, onResult, onClose, tagList }: Props = $props();

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
	class="space-y-4"
	action="?/editTags"
	method="POST"
	onsubmit={(ev) => ev.preventDefault()}
	use:enhance
>
	<div class="flex flex-col">
		<button class="hidden" aria-hidden="true" disabled type="submit"></button>
		<input class="invisible h-0" />

		<div class="space-y-1.5">
			<Label for="artists">Artists</Label>
			<InputChip
				id="artists"
				chips={artists}
				onUpdate={(tags) => updateTags('artist', tags)}
				tags={tagList.filter((tag) => tag.namespace === 'artist').map((tag) => tag.name)}
			/>
		</div>
	</div>

	<div class="space-y-1.5">
		<Label for="circles">Circles</Label>
		<InputChip
			id="circles"
			chips={circles}
			onUpdate={(tags) => updateTags('circle', tags)}
			tags={tagList.filter((tag) => tag.namespace === 'circle').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="magazines">Magazines</Label>
		<InputChip
			id="magazines"
			chips={magazines}
			onUpdate={(tags) => updateTags('magazine', tags)}
			tags={tagList.filter((tag) => tag.namespace === 'magazine').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="events">Events</Label>
		<InputChip
			id="events"
			chips={events}
			onUpdate={(tags) => updateTags('event', tags)}
			tags={tagList.filter((tag) => tag.namespace === 'event').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="publishers">Publishers</Label>
		<InputChip
			id="publishers"
			chips={publishers}
			onUpdate={(tags) => updateTags('publisher', tags)}
			tags={tagList.filter((tag) => tag.namespace === 'publishers').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="parodies">Parodies</Label>
		<InputChip
			id="parodies"
			chips={parodies}
			onUpdate={(tags) => updateTags('parody', tags)}
			tags={tagList.filter((tag) => tag.namespace === 'parody').map((tag) => tag.name)}
		/>
	</div>

	<div class="space-y-1.5">
		<Label for="tags">Tags</Label>
		<InputChip
			id="tags"
			chips={tags}
			onUpdate={(tags) => updateTags('tag', tags)}
			tags={tagList.filter(isTag).map((tag) => tag.name)}
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
