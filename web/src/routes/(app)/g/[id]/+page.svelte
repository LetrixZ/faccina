<script lang="ts">
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import Chip from '$lib/components/chip.svelte';
	import DownloadProgress from '$lib/components/download-progress.svelte';
	import GallerySource from '$lib/components/gallery-source.svelte';
	import GalleryThumbnails from '$lib/components/gallery-thumbnails.svelte';
	import InfoSection from '$lib/components/info-section.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { TagType, type Archive, type Task } from '$lib/models.js';
	import {
		dateTimeFormat,
		generateFilename,
		getMetadata,
		humanFileSize,
		processTags,
		randomString,
	} from '$lib/utils';
	import { AsyncZipDeflate, Zip, ZipPassThrough, strToU8 } from 'fflate';
	import pMap from 'p-map';
	import { toast } from 'svelte-sonner';
	import { writable } from 'svelte/store';
	import AiOutlineRead from '~icons/ant-design/read-outlined';
	import BiSolidDownload from '~icons/bxs/download';

	export let data;

	const startDownload = async (archive: Archive) => {
		const task = writable<Task>({
			archive,
			progress: 0,
			total: archive.images.length,
			complete: false,
		});
		const { createWriteStream } = await import('streamsaver');

		const chunks: any[] = [];

		const promise = new Promise<void>(async (resolve, reject) => {
			const fileStream = createWriteStream(`${generateFilename(archive)}.cbz`);
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

				await pMap(
					archive.images,
					async (image) => {
						const url = `${env.PUBLIC_CDN_URL}/image/${archive.hash}/${image.page_number}`;
						const response = await fetch(url);

						if (!response.ok) {
							throw new Error('Failed to fetch image');
						}

						const blob = await response.blob();
						const extension = blob!.type.split('/').at(-1);
						const imageFile = new ZipPassThrough(`${image.page_number}.${extension}`);
						zip.add(imageFile);

						await blob!
							.arrayBuffer()
							.then((buffer) => imageFile.push(new Uint8Array(buffer), true));

						task.update((task) => ({ ...task, progress: task.progress + 1 }));
					},
					{ concurrency: 2 }
				);

				zip.end();

				task.update((task) => ({ ...task, complete: true }));

				resolve();
			} catch (e) {
				console.error(e);
				await writer.abort();

				reject(e);
			}
		});

		const id = randomString();

		toast.promise(promise, {
			id,
			componentProps: {
				task,
				save: async () => {
					const fileStream = createWriteStream(`${generateFilename(archive)}.cbz`);
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
	<title>Faccina</title>

	{#await data.archive}
		<title>Faccina</title>
	{:then archive}
		<title>{archive.title} • Faccina</title>
	{/await}
</svelte:head>

<main class="container flex flex-col gap-2 md:flex-row">
	{#await data.archive}
		<div class="@container w-full space-y-2 md:w-80">
			<div class="aspect-[90/127] w-full">
				<Skeleton class="h-full w-full" />
			</div>

			<div class="@xs:grid-cols-2 grid gap-2">
				<Button
					class="shadow-shadow flex w-full bg-indigo-700 text-center font-semibold text-white shadow hover:bg-indigo-700/80"
					variant="secondary"
					disabled
				>
					<AiOutlineRead class="size-5 shrink-0" />
					<span class="flex-auto"> Read </span>
				</Button>

				<Button
					class="shadow-shadow flex w-full bg-green-700 text-center font-semibold text-white shadow hover:bg-green-700/80"
					variant="secondary"
					disabled
				>
					<BiSolidDownload class="size-5 shrink-0" />
					<span class="flex-auto"> Download </span>
				</Button>
			</div>

			<div class="shadow-shadow w-full overflow-clip rounded shadow-md md:w-auto">
				<InfoSection class="space-y-1">
					<div class="flex flex-col gap-2">
						<Skeleton class="h-6 w-full" />
						<Skeleton class="h-10 w-full" />
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
		<div class="@container w-full space-y-2 md:w-80">
			<div class="w-full">
				<a href={`./${archive.id}/read/1/${$page.url.search}`}>
					<img
						class="shadow-shadow h-full w-full rounded-md bg-neutral-300 shadow-md dark:bg-neutral-600"
						width={archive.cover ? 640 : undefined}
						height={archive.cover
							? Math.round((640 / archive.cover.width) * archive.cover.height)
							: undefined}
						loading="eager"
						alt={`'${archive.title}' cover`}
						src={`${env.PUBLIC_CDN_URL}/image/${archive.hash}/cover`}
					/>
				</a>
			</div>

			<div class="@xs:grid-cols-2 grid gap-2">
				<Button
					href={`./${archive.id}/read/1${$page.url.search}`}
					class="shadow-shadow flex w-full bg-indigo-700 text-center font-semibold text-white shadow hover:bg-indigo-700/80"
					variant="secondary"
				>
					<AiOutlineRead class="size-5 shrink-0" />
					<span class="flex-auto"> Read </span>
				</Button>

				<Button
					variant="secondary"
					class="shadow-shadow flex w-full bg-green-700 text-center font-semibold text-white shadow hover:bg-green-700/80"
					on:click={() => startDownload(archive)}
				>
					<BiSolidDownload class="size-5 shrink-0" />
					<span class="flex-auto"> Download </span>
				</Button>
			</div>

			<div class="shadow-shadow overflow-clip rounded shadow-md">
				<InfoSection class="space-y-1">
					<p class="text-lg font-semibold leading-6">{archive.title}</p>
					<p class="text-muted-foreground-light text-sm">
						{generateFilename(archive)}
					</p>
				</InfoSection>

				{#if archive.tags.length || archive.circles.length}
					<InfoSection name="Artists">
						<div class="flex flex-wrap gap-2">
							{#each archive.artists as artist}
								<Chip item={artist} type={TagType.ARTIST} />
							{/each}

							{#each archive.circles as circle}
								<Chip item={circle} type={TagType.CIRCLE} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.magazines.length}
					<InfoSection name="Magazines">
						<div class="flex flex-wrap gap-2">
							{#each archive.magazines as magazine}
								<Chip item={magazine} type={TagType.MAGAZINE} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.publishers.length}
					<InfoSection name="Publishers">
						<div class="flex flex-wrap gap-2">
							{#each archive.publishers as publisher}
								<Chip item={publisher} type={TagType.PUBLISHER} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.parodies.length}
					<InfoSection name="Parodies">
						<div class="flex flex-wrap gap-2">
							{#each archive.parodies as parody}
								<Chip item={parody} type={TagType.PARODY} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.tags.length}
					<InfoSection name="Tags">
						<div class="flex flex-wrap gap-2">
							{#each processTags(archive.tags) as tag}
								<Chip item={tag} type={TagType.TAG} />
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.sources.length}
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

				<InfoSection name="Size">
					<p class="text-sm">{humanFileSize(archive.size)}</p>
				</InfoSection>

				<InfoSection name="Released">
					<p class="text-sm">
						{dateTimeFormat(new Date(archive.released_at))}
					</p>
				</InfoSection>

				<InfoSection name="Added">
					<p class="text-sm">
						{dateTimeFormat(new Date(archive.created_at))}
					</p>
				</InfoSection>
			</div>
		</div>

		<GalleryThumbnails {archive} />
	{/await}
</main>
