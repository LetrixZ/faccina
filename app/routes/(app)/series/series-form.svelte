<script lang="ts">
	import Save from 'lucide-svelte/icons/save';
	import { SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import { type SuperForm } from 'sveltekit-superforms';
	import type { z } from 'zod';
	import * as Form from '$lib/components/ui/form';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { type CreateSeriesSchema } from '$lib/schemas.js';
	import type { GalleryListItem } from '$lib/types';

	export let form: SuperForm<z.infer<CreateSeriesSchema>, unknown>;
	export let selected: (GalleryListItem & {
		[SHADOW_ITEM_MARKER_PROPERTY_NAME]?: unknown;
	})[];

	const { form: formData, enhance } = form;

	$: mainGallery = selected.find((gallery) => gallery.id === $formData.mainGallery);

	$: mainGalleryOption = mainGallery
		? {
				label: mainGallery.title,
				value: mainGallery.id,
			}
		: { value: -1, label: '' };
</script>

<form class="flex flex-grow flex-col gap-2" method="POST" use:enhance>
	<Form.Field {form} name="title">
		<Form.Control let:attrs>
			<Form.Label class="text-xl">Series title</Form.Label>
			<Input {...attrs} bind:value={$formData.title} />
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="description">
		<Form.Control let:attrs>
			<Form.Label>Description</Form.Label>
			<Textarea {...attrs} bind:value={$formData.description} class="resize-none" />
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<div class="flex gap-2">
		<Form.Field class="flex-grow" {form} name="mainGallery">
			<Form.Control let:attrs>
				<Form.Label>Main gallery</Form.Label>
				<Select.Root
					disabled={!selected.length}
					onSelectedChange={(option) => {
						if (option) {
							$formData.mainGallery = option.value;
							$formData.coverPage =
								selected.find((gallery) => gallery.id === option.value)?.thumbnail ?? undefined;
						}
					}}
					selected={mainGalleryOption}
				>
					<Select.Trigger {...attrs} class="h-10 bg-transparent">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						{#each selected as gallery}
							<Select.Item value={gallery.id}>{gallery.title}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<input bind:value={$formData.mainGallery} hidden name={attrs.name} />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field class="w-48" {form} name="coverPage">
			<Form.Control let:attrs>
				<Form.Label>Cover page number</Form.Label>
				<Input
					{...attrs}
					bind:value={$formData.coverPage}
					disabled={!mainGallery}
					max={mainGallery?.pages ?? 1}
					min="1"
					type="number"
				/>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	<Form.Button class="ms-auto w-fit gap-x-2 bg-green-700 hover:bg-green-700/80" type="submit">
		<Save class="size-5" />
		<span>Save series</span>
	</Form.Button>
</form>
