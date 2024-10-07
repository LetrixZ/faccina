<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import Chip from '$lib/components/chip.svelte';
	import DownloadProgress from '$lib/components/download-progress.svelte';
	import GallerySource from '$lib/components/gallery-source.svelte';
	import GalleryThumbnails from '$lib/components/gallery-thumbnails.svelte';
	import InfoSection from '$lib/components/info-section.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { type ArchiveDetail, TagType, type Task } from '$lib/models';
	import {
		cn,
		dateTimeFormat,
		generateFilename,
		getMetadata,
		humanFileSize,
		processTags,
		randomString,
	} from '$lib/utils';
	import AiOutlineRead from '~icons/ant-design/read-outlined';
	import BiSolidDownload from '~icons/bxs/download';
	import { AsyncZipDeflate, strToU8, Zip, ZipPassThrough } from 'fflate';
	import { Eye, EyeOff, Heart, Pencil, Tag } from 'lucide-svelte';
	import pMap from 'p-map';
	import { writable } from 'svelte/store';
	import { MetaTags } from 'svelte-meta-tags';
	import { toast } from 'svelte-sonner';

	import ArchiveEditForm from '~/lib/components/archive-edit-form.svelte';
	import ArchiveTaxonomyEditForm from '~/lib/components/archive-taxonomy-edit-form.svelte';
	import { Separator } from '~/lib/components/ui/separator';

	export let data;

	let editOpen = false;
	let editTaxonomyOpen = false;

	$: canDownload = data.site.guestDownloads || data.user;

	const startDownload = async (archive: ArchiveDetail) => {
		const streamSaver = await import('streamsaver');
		streamSaver.default.mitm = '/ss-mitm.html';

		const task = writable<Task>({
			archive,
			progress: 0,
			total: archive.images.length,
			complete: false,
		});

		const chunks: Uint8Array[] = [];

		const promise = new Promise<void>((resolve, reject) => {
			const fileStream = streamSaver.createWriteStream(`${generateFilename(archive)}.cbz`);
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
				const metadataFile = new AsyncZipDeflate('info.json');

				zip.add(metadataFile);

				metadataFile.push(strToU8(JSON.stringify(getMetadata(archive), null, 2)), true);

				pMap(
					archive.images,
					async (image) => {
						const url = `/image/${archive.hash}/${image.page_number}`;
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
					const fileStream = streamSaver.createWriteStream(`${generateFilename(archive)}.cbz`);
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
</script>

<svelte:head>
	<title>{data.archive.title} • {data.site.name}</title>
</svelte:head>

<MetaTags
	canonical={data.site.url}
	description={data.archive.description ?? undefined}
	openGraph={{
		url: `${data.site.url}/g/${data.archive.id}`,
		description: data.archive.description ?? undefined,
		type: 'article',
		images: [{ url: `${data.site.url}/api/og/g/${data.archive.id}` }],
		siteName: data.site.name,
	}}
	title={data.archive.title}
	titleTemplate={`%s - ${data.site.name}`}
	twitter={{
		cardType: 'summary_large_image',
		description: data.archive.description ?? undefined,
		image: `${data.site.url}/api/og/g/${data.archive.id}`,
		title: `${data.archive.title} - ${data.site.name}`,
	}}
/>

<main class="container flex flex-col gap-2 md:flex-row">
	{#await data.archive}
		<div class="w-full space-y-2 @container md:w-80">
			<div class="aspect-[90/127] w-full">
				<Skeleton class="h-full w-full" />
			</div>

			<div class="grid gap-2 @xs:grid-cols-2">
				<Button
					class="flex w-full bg-indigo-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-indigo-700/80"
					disabled
					variant="secondary"
				>
					<AiOutlineRead class="size-5 shrink-0" />
					<span class="flex-auto"> Read </span>
				</Button>

				{#if canDownload}
					<Button
						class={cn(
							'flex w-full bg-indigo-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-indigo-700/80',
							!canDownload && 'col-span-2'
						)}
						disabled
						variant="secondary"
					>
						<BiSolidDownload class="size-5 shrink-0" />
						<span class="flex-auto"> Download </span>
					</Button>
				{/if}

				{#if data.user}
					{#if data.isFavorite}
						<Button
							class="col-span-2 flex w-full bg-transparent text-center font-semibold text-white "
							disabled
							variant="ghost"
						>
							<Heart class="size-5 shrink-0 fill-red-500 text-red-500" />
							<span class="flex-auto"> Remove from Favorites </span>
						</Button>
					{:else}
						<Button
							class="col-span-2 flex w-full bg-transparent text-center font-semibold text-white  "
							disabled
							variant="ghost"
						>
							<Heart class="size-5 shrink-0" />
							<span class="flex-auto"> Add to Favorites </span>
						</Button>
					{/if}
				{/if}
			</div>

			<div class="w-full overflow-clip rounded shadow-md shadow-shadow md:w-auto">
				<InfoSection class="space-y-1">
					<div class="flex flex-col gap-2">
						<Skeleton class="h-6 w-full" />
						<Skeleton class="h-10 w-full" />
					</div>
				</InfoSection>

				<InfoSection name="Description">
					<div class="space-y-1">
						<Skeleton class="h-4 w-[90%]" />
						<Skeleton class="h-4 w-[80%]" />
						<Skeleton class="h-4 w-[60%]" />
					</div>
				</InfoSection>

				<InfoSection name="Artists">
					<Skeleton class="h-6 w-[60%]" />
				</InfoSection>

				<InfoSection name="Magazines">
					<Skeleton class="h-6 w-[80%]" />
				</InfoSection>

				<InfoSection name="Tags">
					<div class="flex flex-col gap-2">
						<Skeleton class="h-6 w-[90%]" />
						<Skeleton class="h-6 w-[80%]" />
					</div>
				</InfoSection>

				<InfoSection name="Length">
					<Skeleton class="h-5 w-20" />
				</InfoSection>

				<InfoSection name="Size">
					<Skeleton class="h-5 w-24" />
				</InfoSection>

				<InfoSection name="Released">
					<Skeleton class="h-5 w-32" />
				</InfoSection>

				<InfoSection name="Added">
					<Skeleton class="h-5 w-32" />
				</InfoSection>
			</div>
		</div>
	{:then archive}
		<div class="w-full space-y-2 @container md:w-80">
			<div class="w-full">
				<a href={`./${archive.id}/read/1/${$page.url.search}`}>
					<img
						alt={`'${archive.title}' cover`}
						class="h-full w-full rounded-md bg-neutral-300 shadow-md shadow-shadow dark:bg-neutral-600"
						height={archive.cover?.width && archive.cover?.height
							? Math.round((640 / archive.cover.width) * archive.cover.height)
							: undefined}
						loading="eager"
						src={`/image/${archive.hash}/${archive.thumbnail}?type=cover`}
						width={archive.cover?.width ? 640 : undefined}
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

					{#if archive.deleted_at}
						<form action="?/show" method="POST" use:enhance>
							<Button
								class="flex w-full bg-slate-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-slate-700/80"
								type="submit"
							>
								<Eye class="size-5 shrink-0" />
								<span class="flex-auto"> Show </span>
							</Button>
						</form>
					{:else}
						<form action="?/hide" method="POST" use:enhance>
							<Button
								class="flex w-full bg-slate-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-slate-700/80"
								type="submit"
							>
								<EyeOff class="size-5 shrink-0" />
								<span class="flex-auto"> Hide </span>
							</Button>
						</form>
					{/if}

					<Button
						class="col-span-2 flex w-full bg-orange-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-orange-700/80"
						on:click={() => (editTaxonomyOpen = true)}
					>
						<Tag class="size-5 shrink-0" />
						<span class="flex-auto"> Edit taxonomy </span>
					</Button>
				</div>

				<Separator />
			{/if}

			<div class="grid gap-2 @xs:grid-cols-2">
				<Button
					class={cn(
						'flex w-full bg-indigo-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-indigo-700/80',
						!canDownload && 'col-span-2'
					)}
					href={`./${archive.id}/read/1${$page.url.search}`}
					variant="secondary"
				>
					<AiOutlineRead class="size-5 shrink-0" />
					<span class="flex-auto"> Read </span>
				</Button>

				{#if canDownload}
					<Button
						class="flex w-full bg-green-700 text-center font-semibold text-white shadow shadow-shadow hover:bg-green-700/80"
						on:click={() => startDownload(archive)}
						variant="secondary"
					>
						<BiSolidDownload class="size-5 shrink-0" />
						<span class="flex-auto"> Download </span>
					</Button>
				{/if}

				{#if data.user}
					{#if data.isFavorite}
						<form action="?/removeFavorite" class="col-span-2" method="POST" use:enhance>
							<Button
								class="flex w-full bg-transparent text-center font-semibold text-white "
								type="submit"
								variant="ghost"
							>
								<Heart class="size-5 shrink-0 fill-red-500 text-red-500" />
								<span class="flex-auto"> Remove from Favorites </span>
							</Button>
						</form>
					{:else}
						<form action="?/addFavorite" class="col-span-2" method="POST" use:enhance>
							<Button
								class="flex w-full bg-transparent text-center font-semibold text-white  "
								type="submit"
								variant="ghost"
							>
								<Heart class="size-5 shrink-0" />
								<span class="flex-auto"> Add to Favorites </span>
							</Button>
						</form>
					{/if}
				{/if}
			</div>

			<div class="overflow-clip rounded shadow-md shadow-shadow">
				<InfoSection class="space-y-1">
					<p class="text-lg font-semibold leading-6">{archive.title}</p>
					<p class="text-sm text-muted-foreground-light">
						{generateFilename(archive)}
					</p>
				</InfoSection>

				{#if archive.description?.length}
					<InfoSection name="Description">
						<p class="text-sm">{archive.description}</p>
					</InfoSection>
				{/if}

				{#if archive.artists?.length || archive.circles?.length}
					<InfoSection name="Artists">
						<div class="flex flex-wrap gap-2">
							{#each archive.artists ?? [] as artist}
								<Chip item={artist} type={TagType.ARTIST} />
							{/each}

							{#each archive.circles ?? [] as circle}
								<Chip item={circle} type={TagType.CIRCLE} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.magazines?.length}
					<InfoSection name="Magazines">
						<div class="flex flex-wrap gap-2">
							{#each archive.magazines as magazine}
								<Chip item={magazine} type={TagType.MAGAZINE} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.events?.length}
					<InfoSection name="Events">
						<div class="flex flex-wrap gap-2">
							{#each archive.events as event}
								<Chip item={event} type={TagType.EVENT} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.publishers?.length}
					<InfoSection name="Publishers">
						<div class="flex flex-wrap gap-2">
							{#each archive.publishers as publisher}
								<Chip item={publisher} type={TagType.PUBLISHER} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.parodies?.length}
					<InfoSection name="Parodies">
						<div class="flex flex-wrap gap-2">
							{#each archive.parodies as parody}
								<Chip item={parody} type={TagType.PARODY} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.tags?.length}
					<InfoSection name="Tags">
						<div class="flex flex-wrap gap-2">
							{#each processTags(archive.tags) as tag}
								<Chip item={tag} type={TagType.TAG} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.sources?.length}
					<InfoSection name="Sources">
						<div class="flex flex-wrap gap-2">
							{#each archive.sources as source}
								<GallerySource {source} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				<InfoSection name="Length">
					<p class="text-sm">{archive.pages} pages</p>
				</InfoSection>

				{#if archive.size}
					<InfoSection name="Size">
						<p class="text-sm">{humanFileSize(archive.size)}</p>
					</InfoSection>
				{/if}

				{#if archive.released_at}
					<InfoSection name="Released">
						<p class="text-sm">
							{dateTimeFormat(archive.released_at)}
						</p>
					</InfoSection>
				{/if}

				<InfoSection name="Added">
					<p class="text-sm">
						{dateTimeFormat(archive.created_at)}
					</p>
				</InfoSection>
			</div>
		</div>

		<GalleryThumbnails {archive} />
	{/await}
</main>

<Dialog.Root
	closeOnEscape={false}
	closeOnOutsideClick={false}
	onOpenChange={(open) => (editOpen = open)}
	open={editOpen}
>
	<Dialog.Content class="max-h-[80dvh] overflow-auto md:w-[85dvw] md:max-w-5xl">
		{#if data.editForm}
			<ArchiveEditForm
				archive={data.archive}
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
	<Dialog.Content class="max-h-[80dvh] overflow-auto md:w-[85dvw] md:max-w-5xl">
		{#if data.editTaxonomyForm}
			<ArchiveTaxonomyEditForm
				data={data.editTaxonomyForm}
				on:close={() => (editTaxonomyOpen = false)}
				on:result={({ detail }) => {
					if (detail.type === 'success') {
						editTaxonomyOpen = false;
					}
				}}
				taxonomies={data.taxonomies}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>
