<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Trash from '@lucide/svelte/icons/trash';
	import prettyBytes from 'pretty-bytes';
	import { toast } from 'svelte-sonner';
	import {
		type Infer,
		intProxy,
		superForm,
		type SuperValidated,
		type ValidationErrors,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { Archive, SiteConfig } from '../types';
	import { editArchiveSchema, type EditArchiveSchema } from '../schemas';
	import { cn } from '../utils';
	import GallerySource from './gallery-source.svelte';
	import { Button } from './ui/button';
	import { Checkbox } from './ui/checkbox';
	import { Separator } from './ui/separator';
	import { Textarea } from './ui/textarea';
	import type { ActionResult } from '@sveltejs/kit';

	type Props = {
		data: SuperValidated<Infer<EditArchiveSchema>>;
		archive: Archive;
		onResult?: (result: ActionResult) => void;
		onClose?: () => void;
		siteConfig: SiteConfig;
	};

	let { data, archive, onResult, onClose, siteConfig }: Props = $props();

	let form = superForm(data, {
		validators: zodClient(editArchiveSchema),
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

	const { form: formData, enhance, errors: formErrors } = form;

	const thumbnailProxy = intProxy(form, 'thumbnail');
	const thumbnail = $derived(parseInt($thumbnailProxy));

	const sourcesValid = $derived($formData.sources.every((source) => source.name));

	let errors = $state<ValidationErrors<Infer<EditArchiveSchema>>>({});

	$effect(() => {
		const unsubscribe = formErrors.subscribe((_errors) => (errors = _errors));
		return () => unsubscribe();
	});
</script>

<form
	class="space-y-4"
	action="?/editInfo"
	method="POST"
	onsubmit={(ev) => ev.preventDefault()}
	use:enhance
>
	<div class="flex gap-4">
		<button class="hidden" aria-hidden="true" disabled type="submit"></button>

		<div class="flex max-w-52 flex-col items-center">
			<img
				class="shadow-shadow aspect-[45/64] w-full rounded-md bg-neutral-800 object-contain shadow-md"
				alt="'{archive.title}' cover"
				height={910}
				loading="eager"
				src="{siteConfig.imageServer}/image/{archive.hash}/{thumbnail}?type=thumb"
				width={640}
			/>

			<Button
				class="text-neutral-200"
				href="/image/{archive.hash}/{thumbnail}?type=cover"
				target="_blank"
				variant="link"
			>
				Open in a new tab
			</Button>
		</div>

		<div class="flex-auto">
			<Form.Field name="title" {form}>
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Title</Form.Label>
						<Input {...props} bind:value={$formData.title} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field name="description" {form}>
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Description</Form.Label>
						<Textarea {...props} bind:value={$formData.description} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<div class="grid grid-cols-3 gap-4">
				<Form.Field name="thumbnail" {form}>
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Thumbnail page</Form.Label>
							<Input
								{...props}
								max={archive.pages}
								min={1}
								type="number"
								bind:value={$thumbnailProxy}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="releasedAt" {form}>
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Released At</Form.Label>
							<Input {...props} type="datetime-local" bind:value={$formData.releasedAt} />
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="language" {form}>
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
				name="protected"
				class="flex flex-row items-start space-y-0 space-x-3 py-2"
				{form}
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
						<input name={props.name} hidden value={$formData.protected} />
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
			{#each $formData.sources as source, i}
				{@const soruceErrors = errors.sources?.[i]}
				<div class="flex flex-col gap-1">
					<div class="flex gap-2">
						<GallerySource class="my-auto size-8 flex-shrink-0" {source} />
						<Input
							class={cn('h-9 w-32', soruceErrors?.name && 'border-destructive')}
							bind:value={source.name}
						/>
						<Input
							class={cn('h-9', soruceErrors?.url && 'border-destructive')}
							bind:value={source.url}
						/>
						<Button
							class="size-9 flex-shrink-0 p-2"
							onclick={() => ($formData.sources = $formData.sources.filter((_, _i) => _i !== i))}
							variant="outline"
						>
							<Trash />
						</Button>
					</div>

					<div>
						{#if soruceErrors?.name}
							<p class="text-destructive text-sm font-medium">
								{soruceErrors.name}
							</p>
						{/if}
						{#if soruceErrors?.url}
							<p class="text-destructive text-sm font-medium">
								{soruceErrors.url}
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
