<script lang="ts">
	import { run } from 'svelte/legacy';
	import { BookmarkPlus, Save } from 'lucide-svelte';
	import { dragHandleZone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import { toast } from 'svelte-sonner';
	import { flip } from 'svelte/animate';
	import { cubicIn } from 'svelte/easing';
	import { fade } from 'svelte/transition';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { pushState } from '$app/navigation';
	import { page } from '$app/stores';
	import CollectionArchiveSearch from '$lib/components/collection-archive-search.svelte';
	import ListItemDrag from '$lib/components/list-item-drag.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { createCollectionSchema } from '$lib/schemas';
	import type { GalleryListItem } from '$lib/types';
	import { cn } from '$lib/utils';

	let { data } = $props();

	let selectedGalleries = $state(
		data.collection.archives as (GalleryListItem & {
			[SHADOW_ITEM_MARKER_PROPERTY_NAME]?: unknown;
		})[]
	);

	run(() => {
		selectedGalleries = data.collection.archives;
	});

	let searchOpen = $derived(!!$page.state.searchOpen);

	let form = superForm(data.editForm, {
		validators: zodClient(createCollectionSchema),
		dataType: 'json',
		resetForm: false,
		onResult: ({ result }) => {
			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data?.message);
			} else if (result.type === 'success' || result.type === 'redirect') {
				toast.success('Changes saved successfully.');
			}
		},
	});

	const { form: formData, enhance, errors } = form;

	const openSearch = () => {
		if (!$page.state.searchOpen) {
			pushState('', {
				searchOpen: true,
			});
		}
	};
</script>

<svelte:head>
	<title>{data.collection.name} • {data.site.name}</title>
</svelte:head>

<main class="container flex flex-auto">
	<form
		class="flex flex-auto flex-col gap-2"
		method="POST"
		onsubmit={() => {
			$formData.archives = selectedGalleries.map((gallery) => gallery.id);
		}}
		use:enhance
	>
		<div class="flex w-full items-start gap-2">
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

			<div class="flex gap-2">
				<Button class="w-full gap-x-2 bg-green-700 hover:bg-green-700/80" type="submit">
					<Save class="size-5" />
					<span class="sr-only">Save changes</span>
				</Button>

				<Button class="w-full gap-x-2 bg-indigo-700 hover:bg-indigo-700/80" onclick={openSearch}>
					<BookmarkPlus class="size-5" />
					<span class="max-md:sr-only">Add galleries</span>
				</Button>
			</div>
		</div>

		{#if selectedGalleries.length}
			<div
				aria-label="Collection"
				class="relative grid gap-2 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4"
				onconsider={(e) => (selectedGalleries = e.detail.items)}
				onfinalize={(e) => (selectedGalleries = e.detail.items)}
				use:dragHandleZone={{
					items: selectedGalleries,
					flipDurationMs: 50,
					dropTargetStyle: {},
				}}
			>
				{#each selectedGalleries as gallery (gallery.id)}
					<div animate:flip={{ duration: 50 }} class="relative">
						<ListItemDrag {gallery} newTab />

						{#if gallery[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
							<div
								class="visible absolute inset-0 m-0 rounded opacity-50"
								in:fade={{ duration: 200, easing: cubicIn }}
							>
								<ListItemDrag {gallery} newTab />
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex flex-auto flex-col items-center justify-center gap-4">
				<h3 class="text-2xl font-medium">No galleries added</h3>
				<Button onclick={openSearch} variant="outline">Add galleries</Button>
			</div>
		{/if}
	</form>
</main>

<Dialog.Root onOpenChange={(open) => !open && history.back()} open={searchOpen}>
	<Dialog.Content
		class="flex h-full !max-h-[95dvh] !max-w-[95dvw] flex-col overflow-y-auto px-2 pb-0 pt-2"
	>
		<CollectionArchiveSearch
			on:bookmark={(ev) => {
				const { gallery, bookmark } = ev.detail;
				if (bookmark) {
					selectedGalleries = [...selectedGalleries, gallery];
				} else {
					selectedGalleries = selectedGalleries.filter(({ id }) => id !== gallery.id);
				}
			}}
			selectedGalleries={selectedGalleries.map((gallery) => gallery.id)}
		/>
	</Dialog.Content>
</Dialog.Root>
