<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';

	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Save, Trash } from 'lucide-svelte';
	import prettyBytes from 'pretty-bytes';
	import { createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { type Infer, intProxy, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	import type { ArchiveDetail } from '../models';

	import { editArchiveSchema, type EditArchiveSchema } from '../schemas';
	import { cn } from '../utils';
	import GallerySource from './gallery-source.svelte';
	import { Button } from './ui/button';
	import { Separator } from './ui/separator';
	import { Textarea } from './ui/textarea';

	export let data: SuperValidated<Infer<EditArchiveSchema>>;
	export let archive: ArchiveDetail;

	const dispatch = createEventDispatcher<{ result: ActionResult; close: void }>();

	let form = superForm(data, {
		validators: zodClient(editArchiveSchema),
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

	const { form: formData, enhance, errors } = form;

	const thumbnailProxy = intProxy(form, 'thumbnail');

	$: thumbnail = parseInt($thumbnailProxy);
	$: thumbnailImage = archive.images[thumbnail - 1];

	$: sourcesValid = $formData.sources.every((source) => source.name);
</script>

<form
	action="?/editInfo"
	class="space-y-4"
	method="POST"
	on:submit={(ev) => ev.preventDefault()}
	use:enhance
>
	<div class="flex gap-4">
		<button aria-hidden="true" class="hidden" disabled type="submit"></button>

		<div class="flex max-w-52 flex-col items-center">
			<img
				alt={`'${archive.title}' cover`}
				class="aspect-[45/64] w-full rounded-md bg-neutral-800 object-contain shadow-md shadow-shadow"
				height={thumbnailImage?.width && thumbnailImage?.height
					? Math.round((640 / thumbnailImage.width) * thumbnailImage.height)
					: undefined}
				loading="eager"
				src={`/image/${archive.hash}/${thumbnail}?type=thumb`}
				width={thumbnailImage?.width ? 640 : undefined}
			/>

			<Button
				class="text-neutral-200"
				href={`/image/${archive.hash}/${thumbnail}?type=cover`}
				target="_blank"
				variant="link"
			>
				Open in a new tab
			</Button>
		</div>

		<div class="flex-auto">
			<Form.Field {form} name="title">
				<Form.Control let:attrs>
					<Form.Label>Title</Form.Label>
					<Input {...attrs} bind:value={$formData.title} />
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="description">
				<Form.Control let:attrs>
					<Form.Label>Description</Form.Label>
					<Textarea {...attrs} bind:value={$formData.description} />
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<div class="grid grid-cols-2 gap-4">
				<Form.Field {form} name="thumbnail">
					<Form.Control let:attrs>
						<Form.Label>Thumbnail page</Form.Label>
						<Input
							{...attrs}
							bind:value={$thumbnailProxy}
							max={archive.pages}
							min={1}
							type="number"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="releasedAt">
					<Form.Control let:attrs>
						<Form.Label>Released At</Form.Label>
						<Input {...attrs} bind:value={$formData.releasedAt} type="datetime-local" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>
		</div>
	</div>

	<Separator />

	<div class="space-y-2">
		<div class="grid grid-cols-3">
			<div>
				<p class="text-sm font-medium">Hash</p>
				<p class="font-mono text-sm">{archive.hash}</p>
			</div>

			<div>
				<p class="text-sm font-medium">Page count</p>
				<p class="font-mono text-sm">{archive.pages}</p>
			</div>

			<div>
				<p class="text-sm font-medium">Size</p>
				<p class="font-mono text-sm">{prettyBytes(archive.size)}</p>
			</div>
		</div>

		{#if 'path' in archive}
			<div>
				<p class="flex items-center gap-1.5 text-sm font-medium">Path</p>
				<p class="font-mono text-sm">{archive.path}</p>
			</div>
		{/if}
	</div>

	<Separator />

	<div>
		<div class="flex flex-col gap-2">
			{#each $formData.sources as _, i}
				<div class="flex flex-col gap-1">
					<div class="flex gap-2">
						<GallerySource class="my-auto size-8 flex-shrink-0" source={$formData.sources[i]} />
						<Input
							bind:value={$formData.sources[i].name}
							class={cn('h-9 w-32', $errors.sources?.[i]?.name && 'border-destructive')}
						/>
						<Input
							bind:value={$formData.sources[i].url}
							class={cn('h-9', $errors.sources?.[i]?.url && 'border-destructive')}
						/>
						<Button
							class="size-9 flex-shrink-0 p-2"
							on:click={() => ($formData.sources = $formData.sources.filter((_, _i) => _i !== i))}
							variant="outline"
						>
							<Trash />
						</Button>
					</div>

					<div>
						{#if $errors.sources?.[i]?.name}
							<p class="text-sm font-medium text-destructive">
								{$errors.sources?.[i]?.name}
							</p>
						{/if}
						{#if $errors.sources?.[i]?.url}
							<p class="text-sm font-medium text-destructive">
								{$errors.sources?.[i]?.url}
							</p>
						{/if}
					</div>
				</div>
			{/each}

			<Button
				disabled={!sourcesValid}
				on:click={() => ($formData.sources = [...$formData.sources, { name: '' }])}
				variant="outline"
			>
				<Plus class="me-2 size-5" /> Add source
			</Button>
		</div>
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
