<script lang="ts">
	import OctagonAlert from 'lucide-svelte/icons/octagon-alert';
	import { dragHandleZone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { cubicIn } from 'svelte/easing';
	import { fade } from 'svelte/transition';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import Save from 'lucide-svelte/icons/save';
	import { toast } from 'svelte-sonner';
	import { pushState } from '$app/navigation';
	import { page } from '$app/stores';
	import GallerySearchModal from '$lib/components/gallery-search-modal.svelte';
	import ListItemDrag from '$lib/components/list-item-drag.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Form from '$lib/components/ui/form';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Select from '$lib/components/ui/select';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { createSeriesSchema } from '$lib/schemas.js';
	import { siteConfig } from '$lib/stores';
	import type { GalleryListItem } from '$lib/types';
	import { cn } from '$lib/utils';

	export let data;

	const form = superForm(data.form, {
		validators: zodClient(createSeriesSchema),
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

	const { form: formData, enhance } = form;

	let selected: (GalleryListItem & {
		[SHADOW_ITEM_MARKER_PROPERTY_NAME]?: unknown;
	})[] = [];

	$: {
		selected = data.series.chapters;
	}

	$: searchOpen = !!$page.state.searchOpen;
	$: mainGallery = selected.find((gallery) => gallery.id === $formData.mainGallery);
	$: cover =
		mainGallery && $formData.coverPage
			? `/image/${mainGallery.hash}/${$formData.coverPage}?type=cover`
			: null;

	$: mainGalleryOption = mainGallery
		? {
				label: mainGallery.title,
				value: mainGallery.id,
			}
		: { value: -1, label: '' };

	$: {
		$formData.chapters = selected.map((selected) => selected.id);
	}

	const openSearch = () => {
		if (!$page.state.searchOpen) {
			pushState('', { searchOpen: true });
		}
	};

	const onSelect = (gallery: GalleryListItem) => {
		if (selected.find((g) => g.id === gallery.id)) {
			selected = selected.filter((g) => g.id !== gallery.id);

			if (mainGallery?.id === gallery.id) {
				if (selected[0]) {
					$formData.mainGallery = selected[0].id;
					$formData.coverPage = selected[0]?.thumbnail ?? undefined;
				} else {
					$formData.mainGallery = -1;
					$formData.coverPage = undefined;
				}
			}
		} else {
			selected = [...selected, gallery];

			if (selected.length === 1 && selected[0]) {
				$formData.mainGallery = selected[0].id;
				$formData.coverPage = selected[0]?.thumbnail ?? undefined;
			}
		}
	};
</script>

<svelte:head>
	<title>Create series | {$siteConfig.name}</title>
</svelte:head>

<main class="container flex flex-auto flex-col gap-4">
	<form class="flex gap-2" method="POST" use:enhance>
		<div class="relative h-fit w-fit max-w-64 overflow-clip rounded-md bg-neutral-900">
			<img
				alt="Cover"
				class={cn('aspect-[45/64] object-contain', !cover && 'invisible')}
				height={910}
				src={cover}
				width={640}
			/>
			{#if !cover}
				<img
					alt="Placeholder"
					class="pointer-events-none absolute inset-0 m-auto blur-2xl brightness-[0.15]"
					src="/favicon.png"
					width="150"
				/>
				<OctagonAlert class="absolute inset-0 m-auto size-20 text-neutral-600" />
			{/if}
		</div>

		<div class="flex flex-grow flex-col gap-2">
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
							<Select.Trigger {...attrs} class="h-10">
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
		</div>
	</form>

	<div class="relative flex flex-auto flex-col gap-2">
		<div class="flex items-center justify-between">
			<p class="text-xl">Chapters</p>
			<Button on:click={openSearch} variant="outline">Add galleries</Button>
		</div>

		<Separator />

		{#if selected.length}
			<div
				aria-label="Collection"
				class="relative grid gap-2 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4"
				on:consider={(e) => (selected = e.detail.items)}
				on:finalize={(e) => (selected = e.detail.items)}
				use:dragHandleZone={{
					items: selected,
					flipDurationMs: 50,
					dropTargetStyle: {},
				}}
			>
				{#each selected as gallery (gallery.id)}
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
			<div
				class="my-auto flex h-fit w-full flex-grow flex-col items-center justify-center gap-4 py-10"
			>
				<h3 class="text-2xl font-medium">No galleries added</h3>
				<Button on:click={openSearch} variant="outline">Add galleries</Button>
			</div>
		{/if}
	</div>
</main>

<Dialog.Root onOpenChange={(open) => !open && history.back()} open={searchOpen}>
	<Dialog.Content
		class="flex h-full !max-h-[95dvh] !max-w-[95dvw] flex-col overflow-y-auto px-3 pb-0 pt-3"
	>
		<GallerySearchModal {onSelect} {selected} />
	</Dialog.Content>
</Dialog.Root>
