<script lang="ts">
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { editArchiveSchema, type EditArchiveSchema } from '../schemas.js';
	import type { Archive } from '../types.js';
	import { cn } from '../utils.js';
	import GallerySource from './gallery-source.svelte';
	import { Button } from './ui/button/index.js';
	import { Checkbox } from './ui/checkbox/index.js';
	import { Separator } from './ui/separator/index.js';
	import { Textarea } from './ui/textarea/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Trash from '@lucide/svelte/icons/trash';
	import type { ActionResult } from '@sveltejs/kit';
	import prettyBytes from 'pretty-bytes';
	import { toast } from 'svelte-sonner';
	import { type Infer, intProxy, superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	let {
		form: initialForm,
		archive,
		imageServer,
		onResult,
		onClose
	}: {
		form: SuperValidated<Infer<EditArchiveSchema>>;
		archive: Archive;
		imageServer: string;
		onResult?: (result: ActionResult) => void;
		onClose?: () => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let form = superForm(initialForm, {
		validators: zodClient(editArchiveSchema),
		dataType: 'json',
		onResult: ({ result }) => {
			onResult?.(result);

			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Changes saved successfully.');
			}
		}
	});

	const { form: formData, enhance, errors } = form;
	const sourcesErrors = $derived($errors.sources);

	const thumbnailProxy = intProxy(form, 'thumbnail');
	const thumbnail = $derived(parseInt($thumbnailProxy));

	const sourcesValid = $derived($formData.sources.every((source) => source.name));
</script>

<form
	action="?/editInfo"
	class="space-y-4"
	method="POST"
	onsubmit={(ev) => ev.preventDefault()}
	use:enhance
>
	<div class="flex gap-4">
		<button aria-hidden="true" class="hidden" disabled type="submit"></button>

		<div class="flex max-w-52 flex-col items-center">
			<img
				alt={`'${archive.title}' cover`}
				class="aspect-45/64 w-full rounded-md bg-neutral-800 object-contain shadow-md shadow-shadow"
				height={910}
				loading="eager"
				src={`${imageServer}/image/${archive.hash}/${thumbnail}?type=thumb`}
				width={640}
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
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Title</Form.Label>
						<Input {...props} bind:value={$formData.title} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="description">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Description</Form.Label>
						<Textarea {...props} bind:value={$formData.description} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<div class="grid grid-cols-3 gap-4">
				<Form.Field {form} name="thumbnail">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Thumbnail page</Form.Label>
							<Input
								{...props}
								bind:value={$thumbnailProxy}
								max={archive.pages}
								min={1}
								type="number"
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="releasedAt">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Released At</Form.Label>
							<Input {...props} bind:value={$formData.releasedAt} type="datetime-local" />
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="language">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Language</Form.Label>
							<Input {...props} bind:value={$formData.language} />
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<Form.Field
				class="flex flex-row items-start space-x-3 space-y-0 py-2"
				{form}
				name="protected"
			>
				<Form.Control>
					{#snippet children({ props })}
						<Checkbox {...props} bind:checked={$formData.protected} />
						<div class="space-y-1 leading-none">
							<Form.Label>Protected</Form.Label>
							<Form.Description>
								Indicate if this gallery should be protected against metadata changes that impact
								during indexing. If enabled, only path, hash, size and images will be updated.
							</Form.Description>
						</div>
						<input hidden name={props.name} value={$formData.protected} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
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
			{#each $formData.sources as source, i (`${source.name}:${source.url}`)}
				{@const errors = sourcesErrors?.[i]}

				<div class="flex flex-col gap-1">
					<div class="flex gap-2">
						<GallerySource class="my-auto size-8 shrink-0" {source} />
						<Input
							bind:value={source.name}
							class={cn('h-9 w-32', errors?.name && 'border-destructive')}
						/>
						<Input bind:value={source.url} class={cn('h-9', errors?.url && 'border-destructive')} />
						<Button
							class="size-9 shrink-0 p-2"
							onclick={() => ($formData.sources = $formData.sources.filter((_, _i) => _i !== i))}
							variant="outline"
						>
							<Trash />
						</Button>
					</div>

					<div>
						{#if errors?.name}
							<p class="text-sm font-medium text-destructive">
								{errors.name}
							</p>
						{/if}
						{#if errors?.url}
							<p class="text-sm font-medium text-destructive">
								{errors.url}
							</p>
						{/if}
					</div>
				</div>
			{/each}

			<Button
				disabled={!sourcesValid}
				onclick={() => ($formData.sources = [...$formData.sources, { name: '' }])}
				variant="outline"
			>
				<Plus class="me-2 size-5" /> Add source
			</Button>
		</div>
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
