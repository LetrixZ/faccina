<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';

	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Save } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { type Infer, intProxy, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	import type { ArchiveDetail } from '../models';

	import { archiveSchema, type ArchiveSchema } from '../schemas';
	import { Button } from './ui/button';
	import { Separator } from './ui/separator';
	import { Textarea } from './ui/textarea';

	export let data: SuperValidated<Infer<ArchiveSchema>>;
	export let archive: ArchiveDetail;

	const dispatch = createEventDispatcher<{ result: ActionResult; close: void }>();

	let form = superForm(data, {
		validators: zodClient(archiveSchema),
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

	const pagesProxy = intProxy(form, 'pages');
	const sizeProxy = intProxy(form, 'size');
	const thumbnailProxy = intProxy(form, 'thumbnail');

	$: thumbnail = parseInt($thumbnailProxy);
	$: thumbnailImage = archive.images[thumbnail - 1];
</script>

<form action="?/editInfo" class="space-y-4" method="POST" use:enhance>
	<div class="flex gap-4">
		<button aria-hidden="true" class="hidden" disabled type="submit"></button>

		<div class="flex max-w-52 flex-col items-center">
			<img
				alt={`'${archive.title}' cover`}
				class=" w-full rounded-md bg-neutral-300 shadow-md shadow-shadow dark:bg-neutral-600"
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
			<div class="grid grid-cols-2 gap-4">
				<Form.Field {form} name="title">
					<Form.Control let:attrs>
						<Form.Label>Title</Form.Label>
						<Input {...attrs} bind:value={$formData.title} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="slug">
					<Form.Control let:attrs>
						<Form.Label>Slug</Form.Label>
						<Input {...attrs} bind:value={$formData.slug} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<Form.Field {form} name="description">
				<Form.Control let:attrs>
					<Form.Label>Description</Form.Label>
					<Textarea {...attrs} bind:value={$formData.description} />
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<div class="grid grid-cols-3 gap-4">
				<Form.Field {form} name="pages">
					<Form.Control let:attrs>
						<Form.Label>Pages</Form.Label>
						<Input {...attrs} bind:value={$pagesProxy} min={1} type="number" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="thumbnail">
					<Form.Control let:attrs>
						<Form.Label>Thumbnail</Form.Label>
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

	<div>
		<Form.Field {form} name="hash">
			<Form.Control let:attrs>
				<Form.Label>Hash</Form.Label>
				<Input {...attrs} bind:value={$formData.hash} readonly />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<div class="flex gap-4">
			<Form.Field class="flex-auto" {form} name="path">
				<Form.Control let:attrs>
					<Form.Label>Path</Form.Label>
					<Input {...attrs} bind:value={$formData.path} />
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="size">
				<Form.Control let:attrs>
					<Form.Label>Size in bytes</Form.Label>
					<Input {...attrs} bind:value={$sizeProxy} class="w-32" min={0} readonly type="number" />
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
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
