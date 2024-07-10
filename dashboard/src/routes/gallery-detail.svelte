<script lang="ts">
	import dayjs from 'dayjs';
	import { PlusIcon, Trash } from 'lucide-svelte';
	import SourceIcon from '$lib/components/source-icon.svelte';
	import InputChip from '$lib/components/input-chip.svelte';
	import HentagLogo from '~/assets/hentag-logo.png';
	import { Textarea } from '$ui/textarea';
	import { Separator } from '$ui/separator';
	import { Input } from '$ui/input';
	import { Label } from '$ui/label';
	import { Switch } from '$ui/switch';
	import { Button } from '$ui/button';
	import { Checkbox } from '$ui/checkbox';
	import { toast } from '$ui/sonner';
	import { ScrapeSite, TagType, type ArchiveData, type Source } from '$lib/models';
	import { onMount } from 'svelte';
	import { reindex, scrape } from '../lib/fetch';

	export let params: { id: string };

	let title = '';
	let slug = '';
	let hash = '';
	let path = '';
	let description = '';
	let language = '';
	let created_at = '';
	let released_at = '';
	let has_metadata = false;
	let artists: string[] = [];
	let circles: string[] = [];
	let magazines: string[] = [];
	let events: string[] = [];
	let publishers: string[] = [];
	let parodies: string[] = [];
	let tags: string[] = [];
	let sources: Source[] = [];

	let keepSlug = false;

	let archive: ArchiveData;

	const reset = () => {
		keepSlug = false;

		title = archive.title;
		slug = archive.slug;
		description = archive.description ?? '';
		hash = archive.key;
		path = archive.path;
		language = archive.language ?? '';
		created_at = dayjs(archive.created_at, { utc: true }).toISOString().slice(0, -5);
		released_at = dayjs(archive.released_at, { utc: true }).format('YYYY-MM-DD');
		has_metadata = archive.has_metadata;
		artists = archive.artists.map((tag) => tag.name) ?? [];
		circles = archive.circles.map((tag) => tag.name) ?? [];
		magazines = archive.magazines.map((tag) => tag.name) ?? [];
		events = archive.events.map((tag) => tag.name) ?? [];
		publishers = archive.publishers.map((tag) => tag.name) ?? [];
		parodies = archive.parodies.map((tag) => tag.name) ?? [];
		tags = archive.tags.map((tag) => tag.name) ?? [];
		sources = archive.sources ?? [];
	};

	const scrapeHenTag = async () => {
		toast.promise(
			scrape([archive.id], ScrapeSite.HENTAG, (archives) => {
				archive = archives[0];
				reset();
			}),
			{
				loading: `Scraping HenTag for archive ID ${archive.id}...`,
				success: () => 'Archive scraped',
				error: (error) => (error as Error).message,
			}
		);
	};

	const save = async () => {
		const res = await fetch('/archive', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				id: archive.id,
				title,
				slug: keepSlug ? slug : undefined,
				description: description?.trim()?.length ? description.trim() : null,
				language: language?.trim()?.length ? language.trim() : null,
				path,
				released_at: dayjs(released_at).toISOString().slice(0, -1),
				has_metadata,
				artists,
				circles,
				magazines,
				events,
				publishers,
				parodies,
				tags: tags.map((tag) => {
					const [namespace, name] = tag.split(':');

					if (name) {
						return [name, namespace];
					} else {
						return [namespace, ''];
					}
				}),
				sources,
			}),
		});

		if (res.ok) {
			const updated: ArchiveData = await res.json();
			archive = updated;
			reset();
			toast.success('Archive updated');
		} else {
			const text = await res.text();
			console.error('Failed to save archive', text);
			toast.error(`Failed to save archive: ${res.statusText}`);
		}
	};

	onMount(() => {
		fetch(`http://localhost:3001/g/${params.id}`)
			.then((res) => res.json())
			.then((data) => {
				archive = data;
				reset();
			});
	});

	const reindexArchives = () => {
		toast.promise(
			reindex([archive.id], (archives) => {
				archive = archives[0];
				reset();
			}),
			{
				loading: `Re-indexing archive ID ${archive.id}...`,
				success: () => 'Archive re-indexed',
				error: (error) => (error as Error).message,
			}
		);
	};
</script>

<main class="container relative space-y-2">
	<div class="flex flex-wrap items-center gap-2">
		{#if archive}
			<div class="w-full text-center md:w-fit">
				<span class="my-auto text-sm font-medium text-muted-foreground"> [{archive.id}]</span>
				<span class="font-semibold">{archive.title}</span>
			</div>
		{/if}

		<div class="mx-auto flex flex-shrink-0 items-center gap-2 md:me-0">
			<Button variant="ghost" on:click={reindexArchives}>Reindex</Button>
			<Button
				variant="outline"
				class="border-[#7c3aed]/50 py-0 hover:bg-[#7c3aed]/20"
				on:click={scrapeHenTag}
			>
				<img class="h-3.5" src={HentagLogo} alt="HenTag logo" />
			</Button>
			<Button variant="outline" on:click={reset}>Images</Button>
			<div class="h-7 w-1 border-e border-e-muted-foreground" />
			<Button variant="secondary" on:click={reset}>Reset</Button>
			<Button variant="green" on:click={save}>Save</Button>
		</div>
	</div>

	<Separator />

	<div class="flex flex-col gap-2 rounded-md border border-muted p-3">
		<p class="text-lg font-medium">Info</p>

		<div class="grid gap-2 lg:grid-cols-2">
			<div class="flex flex-col gap-1.5">
				<Label for="title" class="font-medium">Title</Label>
				<Input id="title" bind:value={title} />
			</div>

			<div class="flex flex-col gap-1.5">
				<div class="flex w-full items-end">
					<Label for="slug" class="flex-grow font-medium">Slug</Label>
					<div class="flex items-center">
						<Checkbox id="keep-slug" class="scale-75" bind:checked={keepSlug} />
						<Label for="keep-slug" class="ps-1 text-xs font-medium">Keep</Label>
					</div>
				</div>
				<Input id="slug" bind:value={slug} />
			</div>
		</div>

		<div class="grid gap-2 lg:grid-cols-2">
			<div class="flex flex-col gap-1.5">
				<Label class="font-medium">Hash</Label>
				<Input value={hash} readonly />
			</div>

			<div class="flex flex-col gap-1.5">
				<Label for="path" class="font-medium">Path</Label>
				<Input id="path" bind:value={path} />
			</div>
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for="description" class="font-medium">Description</Label>
			<Textarea id="description" bind:value={description} />
		</div>
	</div>

	<div class="grid gap-2 lg:grid-cols-2">
		<div class="space-y-2 rounded-md border border-muted p-3">
			<div class="m flex gap-2">
				<span class="text-lg font-medium"> Sources </span>
				<Button
					variant="ghost"
					class="h-fit p-1.5"
					disabled={sources.some(({ name }) => !name.trim().length)}
					on:click={() => (sources = [...sources, { name: '' }])}
				>
					<PlusIcon class="size-4 text-muted-foreground-light" />
					<span class="sr-only">Add source</span>
				</Button>
			</div>

			<div class="flex flex-col gap-2">
				{#each sources as source}
					<div class="flex items-center gap-2">
						<SourceIcon name={source.name} class="size-[1.875rem]" />
						<Input bind:value={source.name} class="h-fit w-[8rem] py-1.5" />
						<Input bind:value={source.url} class="h-fit py-1.5" />
						<Button
							variant="ghost"
							class="size-[2.125rem] flex-shrink-0 p-0.5"
							on:click={() => (sources = sources.filter(({ name }) => name !== source.name))}
						>
							<Trash class="size-4 text-primary/70" />
							<span class="sr-only">Remove source</span>
						</Button>
					</div>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-2 rounded-md border border-muted p-3">
			<p class="text-lg font-medium">Misc</p>

			<div class="flex flex-wrap gap-2 lg:flex-col">
				<div class="flex flex-wrap gap-2">
					<div class="flex flex-col gap-1.5">
						<Label for="created" class="font-medium">Added</Label>
						<Input
							id="created"
							bind:value={created_at}
							type="datetime-local"
							readonly
							class="w-fit"
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						<Label for="released" class="font-medium">Released</Label>
						<Input id="released" bind:value={released_at} type="date" class="w-fit" />
					</div>

					<div class="flex flex-col gap-1.5">
						<Label for="language" class="font-medium">Language</Label>
						<Input id="language" bind:value={language} />
					</div>
				</div>

				<div class="flex h-[3.75rem] items-center">
					<Switch id="has-metadata" bind:checked={has_metadata} />
					<Label for="has-metadata" class="ps-2 font-medium">Has Metadata?</Label>
				</div>
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-2 rounded-md border border-muted p-3">
		<p class="text-lg font-medium">Taxonomy</p>

		<div class="grid gap-2 lg:grid-cols-2">
			<div class="grid gap-2 lg:grid-cols-2">
				<div class="flex flex-col gap-1.5">
					<Label for="artists" class="font-medium">Artists</Label>
					<InputChip id="artists" type={TagType.ARTIST} bind:value={artists} />
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="circles" class="font-medium">Circles</Label>
					<InputChip id="circles" type={TagType.CIRCLE} bind:value={circles} />
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="magazines" class="font-medium">Magazines</Label>
					<InputChip id="magazines" type={TagType.MAGAZINE} bind:value={magazines} />
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="events" class="font-medium">Events</Label>
					<InputChip id="events" type={TagType.EVENT} bind:value={events} />
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="publishers" class="font-medium">Publishers</Label>
					<InputChip id="publishers" type={TagType.PUBLISHER} bind:value={publishers} />
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="parodies" class="font-medium">Parodies</Label>
					<InputChip id="parodies" type={TagType.PARODY} bind:value={parodies} />
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<Label for="tags" class="font-medium">Tags</Label>
				<InputChip id="tags" type={TagType.TAG} bind:value={tags} />
			</div>
		</div>
	</div>
</main>
