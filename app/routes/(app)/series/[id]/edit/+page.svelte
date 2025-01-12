<script lang="ts">
	import OctagonAlert from 'lucide-svelte/icons/octagon-alert';
	import { dragHandleZone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import { toast } from 'svelte-sonner';
	import { flip } from 'svelte/animate';
	import { cubicIn } from 'svelte/easing';
	import { fade } from 'svelte/transition';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import SeriesForm from '../../series-form.svelte';
	import { pushState } from '$app/navigation';
	import { page } from '$app/stores';
	import GallerySearchModal from '$lib/components/gallery-search-modal.svelte';
	import ListItemDrag from '$lib/components/list-item-drag.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Separator from '$lib/components/ui/separator/separator.svelte';
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

	const { form: formData } = form;

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
	<div class="flex gap-2">
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
		<SeriesForm {form} {selected} />
	</div>

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
