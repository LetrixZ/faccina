<script lang="ts">
	import { strToU8, Zip, ZipPassThrough } from 'fflate';
	import { Bookmark, Eye, EyeOff, Heart, Info, Pencil, Tag } from 'lucide-svelte';
	import pMap from 'p-map';
	import { MetaTags } from 'svelte-meta-tags';
	import { toast } from 'svelte-sonner';
	import { writable } from 'svelte/store';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import ArchiveEditForm from '$lib/components/archive-edit-form.svelte';
	import ArchiveTagsEditForm from '$lib/components/archive-tag-edit-form.svelte';
	import BookmarkDialog from '$lib/components/bookmark-dialog.svelte';
	import Chip from '$lib/components/chip.svelte';
	import DownloadProgress from '$lib/components/download-progress.svelte';
	import GallerySource from '$lib/components/gallery-source.svelte';
	import GalleryThumbnails from '$lib/components/gallery-thumbnails.svelte';
	import InfoSection from '$lib/components/info-section.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';
	import { type Task } from '$lib/models';
	import { siteConfig, userCollections } from '$lib/stores';
	import {
		cn,
		dateTimeFormat,
		generateFilename,
		getMetadata,
		humanFileSize,
		isTag,
		randomString,
	} from '$lib/utils';
	import AiOutlineRead from '~icons/ant-design/read-outlined';
	import BiSolidDownload from '~icons/bxs/download';

	export let data;

	let editOpen = false;
	let editTaxonomyOpen = false;
	let collectionsOpen = false;

	$: canDownload = data.site.guestDownloads || !!data.user;
	$: gallery = data.gallery;
	$: archive = data.archive;

	$: artists = gallery.tags.filter((tag) => tag.namespace === 'artist');
	$: circles = gallery.tags.filter((tag) => tag.namespace === 'circle');
	$: magazines = gallery.tags.filter((tag) => tag.namespace === 'magazine');
	$: events = gallery.tags.filter((tag) => tag.namespace === 'event');
	$: publishers = gallery.tags.filter((tag) => tag.namespace === 'publisher');
	$: parodies = gallery.tags.filter((tag) => tag.namespace === 'parody');
	$: tags = gallery.tags.filter(isTag);

	const startDownload = async (ev: MouseEvent) => {
		if (!$siteConfig.clientSideDownloads) {
			return;
		} else {
			ev.preventDefault();
		}

		const streamSaver = await import('streamsaver');
		streamSaver.default.mitm = '/ss-mitm.html';

		const task = writable<Task>({
			gallery: gallery,
			progress: 0,
			total: gallery.images.length,
			complete: false,
		});

		const chunks: Uint8Array[] = [];

		const promise = new Promise<void>((resolve, reject) => {
			const fileStream = streamSaver.createWriteStream(`${generateFilename(gallery)}.cbz`);
			const writer = fileStream.getWriter();

			const zip = new Zip();

			zip.ondata = async (err, chunk, final) => {
				if (!err) {
					chunks.push(chunk);
					writer.write(chunk);

					if (final) {
						writer.close();
					}
				} else {
					writer.abort();
					reject(err);
				}
			};

			const beforeUnloadHandler = () => writer.abort();
			window.addEventListener('beforeunload', beforeUnloadHandler);
			writer.closed
				.then(() => window.removeEventListener('beforeunload', beforeUnloadHandler))
				.catch(() => {});

			try {
				const metadataFile = new ZipPassThrough('info.json');
				zip.add(metadataFile);
				metadataFile.push(
					strToU8(JSON.stringify(getMetadata(gallery, location.origin), null, 2)),
					true
				);

				pMap(
					gallery.images,
					async (image) => {
						const url = `/image/${gallery.hash}/${image.pageNumber}`;
						const response = await fetch(url);

						if (!response.ok) {
							throw new Error('Failed to fetch image');
						}

						const blob = await response.blob();
						const imageFile = new ZipPassThrough(image.filename);
						zip.add(imageFile);

						await blob!
							.arrayBuffer()
							.then((buffer) => imageFile.push(new Uint8Array(buffer), true));

						task.update((task) => ({ ...task, progress: task.progress + 1 }));
					},
					{ concurrency: 3 }
				).then(() => {
					zip.end();

					task.update((task) => ({ ...task, complete: true }));

					resolve();
				});
			} catch (e) {
				console.error(e);
				writer.abort().then(() => reject(e));
			}
		});

		const id = randomString();

		toast.promise(promise, {
			id,
			componentProps: {
				task,
				save: async () => {
					const fileStream = streamSaver.createWriteStream(`${generateFilename(gallery)}.cbz`);
					const writer = fileStream.getWriter();

					for (const chunk of chunks) {
						await writer.write(chunk);
					}

					writer.close();
				},
			},
			loading: DownloadProgress,
			success: () => DownloadProgress,
			error: () => {
				setTimeout(() => toast.dismiss(id), 5000);

				return 'Download failed';
			},
			position: 'bottom-center',
			duration: 10000,
		});
	};

	$: isBookmarked = !!$userCollections
		?.find((c) => c.protected)
		?.archives.find((a) => a.id === gallery.id);
</script>

<svelte:head>
	<title>{gallery.title} • {data.site.name}</title>
</svelte:head>

<MetaTags
	canonical={data.site.url}
	description={gallery.description ?? undefined}
	openGraph={{
		url: `${data.site.url}/g/${gallery.id}`,
		description: gallery.description ?? undefined,
		type: 'article',
		images: [{ url: `${data.site.url}/api/og/g/${gallery.id}` }],
		siteName: data.site.name,
	}}
	title={gallery.title}
	titleTemplate={`%s - ${data.site.name}`}
	twitter={{
		cardType: 'summary_large_image',
		description: gallery.description ?? undefined,
		image: `${data.site.url}/api/og/g/${gallery.id}`,
		title: `${gallery.title} - ${data.site.name}`,
	}}
/>

<main class="container flex flex-col gap-2 md:flex-row">
	<div class="w-full space-y-2 @container md:w-80">
		<div class="w-full">
			<a href={`./${gallery.id}/read/1/${$page.url.search}`}>
				<img
					alt={`'${gallery.title}' cover`}
					class="aspect-[45/64] h-full w-full rounded-md bg-neutral-800 object-contain shadow-md shadow-shadow"
					height={910}
					loading="eager"
					src={`/image/${gallery.hash}/${gallery.thumbnail}?type=cover`}
					width={640}
				/>
			</a>
		</div>

		{#if data.user?.admin}
			<Separator />

			<div class="grid gap-2 @xs:grid-cols-2">
				<Button
					class="flex w-full bg-sky-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-sky-700/80"
					on:click={() => (editOpen = true)}
				>
					<Pencil class="size-5 shrink-0" />
					<span class="flex-auto"> Edit info </span>
				</Button>

				<Button
					class="flex w-full bg-orange-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-orange-700/80"
					on:click={() => (editTaxonomyOpen = true)}
				>
					<Tag class="size-5 shrink-0" />
					<span class="flex-auto"> Edit tags </span>
				</Button>

				{#if archive?.deletedAt}
					<form action="?/show" class="col-span-2" method="POST" use:enhance>
						<Button
							class="flex w-full bg-slate-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-slate-700/80"
							type="submit"
						>
							<Eye class="size-5 shrink-0" />
							<span class="flex-auto"> Show </span>
						</Button>
					</form>
				{:else}
					<form action="?/hide" class="col-span-2" method="POST" use:enhance>
						<Button
							class="flex w-full bg-slate-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-slate-700/80"
							type="submit"
						>
							<EyeOff class="size-5 shrink-0" />
							<span class="flex-auto"> Hide </span>
						</Button>
					</form>
				{/if}
			</div>

			<Separator />
		{/if}

		<div class="grid gap-2 @xs:grid-cols-2">
			{#if !data.readEntry || data.readEntry.finishedAt}
				<Button
					class={'flex w-full bg-indigo-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-indigo-700/80'}
					href={`./${gallery.id}/read/1${$page.url.search}`}
					variant="secondary"
				>
					<AiOutlineRead class="size-5 shrink-0" />
					<span class="flex-auto"> Start reading </span>
				</Button>
			{:else}
				<Button
					class={'flex w-full bg-indigo-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-indigo-700/80'}
					href={`./${gallery.id}/read/${data.readEntry.lastPage}${$page.url.search}`}
					variant="secondary"
				>
					<AiOutlineRead class="size-5 shrink-0" />
					<span class="flex-auto"> Continue </span>
				</Button>
			{/if}

			<div class="relative">
				<Button
					class={cn(
						'flex w-full bg-green-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-green-700/80',
						!canDownload && 'pointer-events-none opacity-50'
					)}
					href="/g/{gallery.id}/download"
					on:click={startDownload}
					variant="secondary"
				>
					<BiSolidDownload class="size-5 shrink-0" />
					<span class="flex-auto"> Download </span>
				</Button>
			</div>

			{#if !canDownload}
				<div class="col-span-2 flex items-center gap-2 px-2 py-0.5 text-sm text-neutral-300">
					<Info class="size-4" />
					<span class="w-full flex-auto text-center">Guest downloads are disabled</span>
				</div>
			{/if}

			{#if data.user}
				<div class="col-span-2 flex items-center">
					<div class="flex-auto">
						{#if data.isFavorite}
							<form action="?/removeFavorite" method="POST" use:enhance>
								<Button
									class="flex w-full bg-transparent text-center font-semibold text-white"
									type="submit"
									variant="ghost"
								>
									<Heart class="size-5 shrink-0 fill-red-500 text-red-500" />
									<span class="flex-auto"> Remove from Favorites </span>
								</Button>
							</form>
						{:else}
							<form action="?/addFavorite" method="POST" use:enhance>
								<Button
									class="flex w-full bg-transparent text-center font-semibold text-white"
									type="submit"
									variant="ghost"
								>
									<Heart class="size-5 shrink-0" />
									<span class="flex-auto"> Add to Favorites </span>
								</Button>
							</form>
						{/if}
					</div>

					{#if $siteConfig.enableCollections}
						<Dialog.Root onOpenChange={(open) => (collectionsOpen = open)} open={collectionsOpen}>
							<Dialog.Trigger>
								<Button
									class="flex w-fit bg-transparent p-2 text-center font-semibold text-white"
									variant="ghost"
								>
									{#if isBookmarked}
										<Bookmark class="size-6 fill-current" />
									{:else}
										<Bookmark class="size-6" />
									{/if}
									<span class="sr-only"> Bookmark </span>
								</Button>
							</Dialog.Trigger>
							<Dialog.Content>
								<BookmarkDialog {gallery} />
							</Dialog.Content>
						</Dialog.Root>
					{/if}
				</div>
			{/if}
		</div>

		<div class="overflow-clip rounded shadow-md shadow-shadow">
			<InfoSection class="space-y-1">
				<p class="text-lg font-semibold leading-6">{gallery.title}</p>
				<p class="text-sm text-muted-foreground-light">
					{generateFilename(gallery)}
				</p>
			</InfoSection>

			{#if gallery.description?.length}
				<InfoSection name="Description">
					<p class="text-sm">{gallery.description}</p>
				</InfoSection>
			{/if}

			{#if artists.length}
				<InfoSection name="Artists">
					<div class="flex flex-wrap gap-2">
						{#each artists as artist}
							<Chip tag={artist} type="artist" />
						{/each}
					</div>
				</InfoSection>
			{/if}

			{#if circles.length}
				<InfoSection name="Circles">
					<div class="flex flex-wrap gap-2">
						{#each circles as circle}
							<Chip tag={circle} type="circle" />
						{/each}
					</div>
				</InfoSection>
			{/if}

			{#if magazines.length}
				<InfoSection name="Magazines">
					<div class="flex flex-wrap gap-2">
						{#each magazines as magazine}
							<Chip tag={magazine} type="magazine" />
						{/each}
					</div>
				</InfoSection>
			{/if}

			{#if events.length}
				<InfoSection name="Events">
					<div class="flex flex-wrap gap-2">
						{#each events as event}
							<Chip tag={event} type="event" />
						{/each}
					</div>
				</InfoSection>
			{/if}

			{#if publishers.length}
				<InfoSection name="Publishers">
					<div class="flex flex-wrap gap-2">
						{#each publishers as publisher}
							<Chip tag={publisher} type="publisher" />
						{/each}
					</div>
				</InfoSection>
			{/if}

			{#if parodies.length}
				<InfoSection name="Parodies">
					<div class="flex flex-wrap gap-2">
						{#each parodies as parody}
							<Chip tag={parody} type="parody" />
						{/each}
					</div>
				</InfoSection>
			{/if}

			{#if tags.length}
				<InfoSection name="Tags">
					<div class="flex flex-wrap gap-2">
						{#each tags as tag}
							<Chip {tag} type="tag" />
						{/each}
					</div>
				</InfoSection>
			{/if}

			{#if gallery.sources?.length}
				<InfoSection name="Sources">
					<div class="flex flex-wrap gap-2">
						{#each gallery.sources as source}
							<GallerySource {source} />
						{/each}
					</div>
				</InfoSection>
			{/if}

			<InfoSection name="Length">
				<p class="text-sm">{gallery.pages} pages</p>
			</InfoSection>

			{#if gallery.size}
				<InfoSection name="Size">
					<p class="text-sm">{humanFileSize(gallery.size)}</p>
				</InfoSection>
			{/if}

			{#if gallery.releasedAt}
				<InfoSection name="Released">
					<p class="text-sm">
						{dateTimeFormat(gallery.releasedAt)}
					</p>
				</InfoSection>
			{/if}

			<InfoSection name="Added">
				<p class="text-sm">
					{dateTimeFormat(gallery.createdAt)}
				</p>
			</InfoSection>
		</div>
	</div>

	<GalleryThumbnails archive={gallery} />
</main>

<Dialog.Root
	closeOnEscape={false}
	closeOnOutsideClick={false}
	onOpenChange={(open) => (editOpen = open)}
	open={editOpen}
>
	<Dialog.Content class="max-h-[95dvh] overflow-auto md:w-[95dvw] md:max-w-5xl">
		{#if archive && data.editForm}
			<ArchiveEditForm
				{archive}
				data={data.editForm}
				on:close={() => (editOpen = false)}
				on:result={({ detail }) => {
					if (detail.type === 'success') {
						editOpen = false;
					}
				}}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root
	closeOnEscape={false}
	closeOnOutsideClick={false}
	onOpenChange={(open) => (editTaxonomyOpen = open)}
	open={editTaxonomyOpen}
>
	<Dialog.Content class="max-h-[95dvh] overflow-auto md:w-[95dvw] md:max-w-5xl">
		{#if archive && data.editTagsForm}
			<ArchiveTagsEditForm
				data={data.editTagsForm}
				on:close={() => (editTaxonomyOpen = false)}
				on:result={({ detail }) => {
					if (detail.type === 'success') {
						editTaxonomyOpen = false;
					}
				}}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>
