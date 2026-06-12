<script lang="ts">
	import CollectionArchiveSearch from '$lib/components/collection-archive-search.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { createCollectionSchema } from '$lib/schemas.js';
	import { cn } from '$lib/utils.js';
	import Save from '@lucide/svelte/icons/save';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let form = superForm(data.createForm, {
		validators: zodClient(createCollectionSchema),
		dataType: 'json',
		onResult: ({ result }) => {
			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Collection created succesfully.');
			}
		}
	});

	const { form: formData, enhance, errors } = form;
</script>

<main class="container flex flex-auto flex-col gap-2 overflow-hidden">
	<form method="POST" use:enhance>
		<div class="flex items-start gap-2">
			<Form.Field class="flex-auto" {form} name="name">
				<Form.Control>
					{#snippet children({ props })}
						<Input
							{...props}
							bind:value={$formData.name}
							class={cn('text-xl font-semibold placeholder:font-medium placeholder:opacity-50')}
							placeholder="Collection name"
						/>

						{#if $errors.name}
							<Form.FieldErrors />
						{/if}
					{/snippet}
				</Form.Control>
			</Form.Field>

			<Button
				class="ms-auto gap-x-2 bg-green-700 hover:bg-green-700/80"
				type="submit"
				variant="green-outline"
			>
				<Save class="size-5" />

				<span class="hidden md:block">Create collection</span>
			</Button>
		</div>
	</form>

	<Separator />

	<CollectionArchiveSearch
		defaultOrder={data.site.defaultOrder}
		defaultSort={data.site.defaultSort}
		imageServer={data.site.imageServer}
		onBookmark={(detail) => {
			const { gallery, bookmark } = detail;
			if (bookmark) {
				$formData.archives = [...$formData.archives, gallery.id];
			} else {
				$formData.archives = $formData.archives.filter((id) => id !== gallery.id);
			}
		}}
		pageLimits={data.site.pageLimits}
		searchPlaceholder={data.site.searchPlaceholder}
		selectedGalleries={$formData.archives}
		tags={data.tagList}
	/>
</main>
