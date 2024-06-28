<script lang="ts">
	import dayjs from 'dayjs';
	import { Button, ChipList, HentagLogo, InfoSection, Source } from 'shared';
	import * as Dialog from 'shared/components/ui/dialog';
	import { ScrapeSite, TagType, type ArchiveData } from 'shared/models';
	import { dateTimeFormat, generateFilename, humanFileSize, processTags } from 'shared/utils';
	import { toast } from 'svelte-sonner';
	import { scrape, updateArchive } from '../lib/fetch';
	import { searchParams } from '../lib/stores';
	import ModalEdit from './modal-edit.svelte';
	import { onMount } from 'svelte';

	export let archive: ArchiveData;

	let modalOpen = false;

	const scrapeHenTag = async () => {
		toast.promise(
			scrape([archive.id], ScrapeSite.HENTAG, (archives) => (archive = archives[0])),
			{
				loading: `Scraping HenTag for archive ID ${archive.id}...`,
				success: () => 'Archive(s) scraped',
				error: (error) => (error as Error).message
			}
		);
	};
</script>

<div class="flex h-fit gap-2 rounded-md border border-border bg-neutral-800 p-2 shadow-sm">
	<div class="space-y-2">
		<div class="float-end h-[300px] flex-shrink-0 ps-2">
			<img
				class=" h-full rounded-md bg-neutral-300 dark:bg-neutral-600"
				loading="lazy"
				alt={`'${archive.title}' cover`}
				src={`http://localhost:3001/image/${archive.hash}/cover`}
			/>
		</div>

		<div class="!mt-0 flex flex-col gap-2">
			<InfoSection class="w-full space-y-1 rounded-md">
				<p class="text-lg font-semibold leading-6">{archive.title}</p>
				<p class="text-sm text-muted-foreground-light">
					{generateFilename(archive)}
				</p>
			</InfoSection>
		</div>

		{#if archive.description}
			<div class="flex flex-col gap-2">
				<InfoSection name="Description" class="w-full rounded-md">
					<p class="text-sm">{archive.description}</p>
				</InfoSection>
			</div>
		{/if}

		{#if archive.artists || archive.circles}
			<div class="flex gap-2">
				{#if archive.artists}
					<InfoSection name="Artists" class="w-full rounded-md">
						<div class="flex flex-wrap gap-2">
							{#each archive.artists as artist}
								<ChipList
									item={artist}
									type={TagType.ARTIST}
									onClick={() =>
										($searchParams.query = `${TagType.ARTIST}:'${artist.name.toLowerCase()}'`)}
								/>
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.circles}
					<InfoSection name="Circles" class="w-full rounded-md">
						<div class="flex flex-wrap gap-2">
							{#each archive.circles as circle}
								<ChipList
									item={circle}
									type={TagType.CIRCLE}
									onClick={() =>
										($searchParams.query = `${TagType.CIRCLE}:'${circle.name.toLowerCase()}'`)}
								/>
							{/each}
						</div>
					</InfoSection>
				{/if}
			</div>
		{/if}

		{#if archive.magazines || archive.events || archive.publishers || archive.parodies}
			<div class="flex gap-2">
				{#if archive.magazines}
					<InfoSection name="Magazines" class="w-full rounded-md">
						<div class="flex flex-wrap gap-2">
							{#each archive.magazines as magazine}
								<ChipList
									item={magazine}
									type={TagType.MAGAZINE}
									onClick={() =>
										($searchParams.query = `${TagType.MAGAZINE}:'${magazine.name.toLowerCase()}'`)}
								/>
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.events}
					<InfoSection name="Events" class="rounded-md">
						<div class="flex flex-wrap gap-2">
							{#each archive.events as event}
								<ChipList
									item={event}
									type={TagType.EVENT}
									onClick={() =>
										($searchParams.query = `${TagType.EVENT}:'${event.name.toLowerCase()}'`)}
								/>
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.publishers}
					<InfoSection name="Publishers" class="w-full rounded-md">
						<div class="flex flex-wrap gap-2">
							{#each archive.publishers as publisher}
								<ChipList
									item={publisher}
									type={TagType.PUBLISHER}
									onClick={() =>
										($searchParams.query = `${TagType.PUBLISHER}:'${publisher.name.toLowerCase()}'`)}
								/>
							{/each}
						</div>
					</InfoSection>
				{/if}

				{#if archive.parodies}
					<InfoSection name="Parodies" class="w-full rounded-md">
						<div class="flex flex-wrap gap-2">
							{#each archive.parodies as parody}
								<ChipList
									item={parody}
									type={TagType.PARODY}
									onClick={() =>
										($searchParams.query = `${TagType.PARODY}:'${parody.name.toLowerCase()}'`)}
								/>
							{/each}
						</div>
					</InfoSection>
				{/if}
			</div>
		{/if}

		{#if archive.tags}
			<div class="flex flex-col gap-2">
				<InfoSection name="Tags" class="w-full rounded-md">
					<div class="flex flex-wrap gap-2">
						{#each processTags(archive.tags) as tag}
							<ChipList
								item={tag}
								type={TagType.TAG}
								onClick={() =>
									($searchParams.query = `${tag.namespace?.length ? tag.namespace : TagType.TAG}:'${tag.name.toLowerCase()}'`)}
							/>
						{/each}
					</div>
				</InfoSection>
			</div>
		{/if}

		{#if archive.sources?.length}
			<div class="flex flex-col gap-2">
				<InfoSection name="Sources" class="w-full rounded-md">
					<div class="flex flex-wrap gap-2">
						{#each archive.sources as source}
							<Source {source} />
						{/each}
					</div>
				</InfoSection>
			</div>
		{/if}

		<!-- Language / Length / Size -->
		<div class="flex gap-2">
			{#if archive.language}
				<InfoSection name="Language" class="w-full rounded-md">
					<p class="text-sm">{archive.language}</p>
				</InfoSection>
			{/if}

			<InfoSection name="Length" class="w-full rounded-md">
				<p class="text-sm">{archive.pages} pages</p>
			</InfoSection>

			<InfoSection name="Size" class="w-full rounded-md">
				<p class="text-sm">{humanFileSize(archive.size)}</p>
			</InfoSection>
		</div>

		<!-- Released / Added -->
		<div class="flex gap-2">
			<InfoSection name="Released" class="w-full rounded-md">
				<p class="text-sm">
					{dateTimeFormat(new Date(archive.released_at))}
				</p>
			</InfoSection>

			<InfoSection name="Added" class="w-full rounded-md">
				<p class="text-sm">
					{dateTimeFormat(new Date(archive.created_at))}
				</p>
			</InfoSection>
		</div>

		<InfoSection name="Path" class="rounded-md">
			<p class="break-all text-sm">{archive.path}</p>
		</InfoSection>

		<InfoSection name="Hash" class="rounded-md">
			<p class="break-all text-sm">{archive.hash}</p>
		</InfoSection>

		<InfoSection name="Thumbnail" class="rounded-md">
			<div class="break-all text-sm">
				{archive.images[archive.thumbnail - 1].filename}
				(page {archive.thumbnail})
			</div>
		</InfoSection>

		<InfoSection
			class="mt-auto flex flex-wrap gap-2 place-self-end self-end justify-self-end rounded-md  p-3"
		>
			<Button
				class="h-6 bg-blue-700 px-2 py-0 hover:bg-blue-700/80"
				on:click={() => (modalOpen = true)}>Edit</Button
			>
			{#if archive.deleted_at}
				<Button
					class="h-6 bg-slate-700 px-2 py-0 hover:bg-slate-700/80"
					on:click={() =>
						updateArchive({ ...archive, deleted_at: null }, (updated) => {
							archive = updated;
							toast.success('Archive published');
						})}
				>
					Publish
				</Button>
			{:else}
				<Button
					class="h-6 bg-zinc-700 px-2 py-0 hover:bg-zinc-700/80"
					on:click={() =>
						updateArchive(
							{ ...archive, deleted_at: dayjs().format('YYYY-MM-DDTHH:mm:ss') },
							(updated) => {
								archive = updated;
								toast.success('Archive unpublished');
							}
						)}
				>
					Unpublish
				</Button>
			{/if}

			<Button class="h-6 bg-violet-700 px-2 py-0 hover:bg-violet-700/80" on:click={scrapeHenTag}>
				Scrape <img
					src={HentagLogo}
					alt="HenTag logo"
					class="ms-2 h-5 rounded-md bg-neutral-900 px-2 py-[0.2rem]"
				/>
			</Button>

			<p class="my-auto ms-auto text-sm font-bold text-muted-foreground-light">
				[{archive.id}]
			</p>
		</InfoSection>
	</div>
</div>

<Dialog.Root bind:open={modalOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>ID {archive.id}</Dialog.Title>
		</Dialog.Header>

		<ModalEdit
			{archive}
			onSave={(updated) => {
				modalOpen = false;
				archive = updated;
				toast.success('Archive updated');
			}}
			onClose={() => (modalOpen = false)}
		/>
	</Dialog.Content>
</Dialog.Root>
