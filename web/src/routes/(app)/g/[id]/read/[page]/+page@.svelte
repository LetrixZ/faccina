<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { cn } from '$lib/utils';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	export let data;

	$: archive = data.archive;
	$: currentPage = parseInt($page.params.page!);
	$: image = archive.images.find((image) => image.page_number === currentPage)!;

	$: prevPage = currentPage > 1 ? currentPage - 1 : undefined;
	$: nextPage = currentPage < archive.pages ? currentPage + 1 : undefined;

	$: prevPageUrl = prevPage ? `${prevPage}${$page.url.search}` : undefined;
	$: nextPageUrl = nextPage ? `${nextPage}${$page.url.search}` : undefined;

	let isMounted = false;

	$: {
		if (isMounted) {
			if (nextPage) {
				{
					const image = new Image();
					image.src = `${env.CDN_URL}/archive/${archive.id}/${nextPage}`;
				}

				if (nextPage < archive.pages) {
					{
						const image = new Image();
						image.src = `${env.CDN_URL}/archive/${archive.id}/${nextPage + 1}`;
					}
				}
			}

			if (prevPage) {
				{
					const image = new Image();
					image.src = `${env.CDN_URL}/archive/${archive.id}/${prevPage}`;
				}
			}
		}
	}

	onMount(() => {
		isMounted = true;
	});
</script>

<svelte:head>
	<title>Page {currentPage} • {archive.title} • Faccina</title>
</svelte:head>

<svelte:window
	on:keydown={(event) => {
		switch (event.key) {
			case 'ArrowLeft':
				if (prevPageUrl) {
					goto(prevPageUrl);
				}
				break;
			case 'ArrowRight':
				if (nextPageUrl) {
					goto(nextPageUrl);
				}
				break;
			case 'ArrowUp':
				goto(`/g/${archive.id}${$page.url.search}`);
		}
	}}
/>

<div class="flex h-dvh w-full flex-col">
	<div
		class="bg-background mx-auto flex min-h-10 max-w-full"
		style={`width: calc((100dvh - 2.5rem) * ${image.width / image.height});`}
	>
		<a
			href={prevPageUrl}
			draggable="false"
			class={cn(
				'text-muted-foreground-light inline-flex h-full flex-1 items-center justify-center p-0 text-sm font-medium underline-offset-4 hover:underline',
				!prevPage && 'pointer-events-none opacity-40'
			)}
		>
			<ChevronLeft class="me-2" />
			Previous
		</a>

		<a
			href={`/g/${archive.id}${$page.url.search}`}
			draggable="false"
			class="text-muted-foreground-light inline-flex h-full flex-grow items-center justify-center p-0 text-sm font-medium underline-offset-4 hover:underline"
		>
			<span>Go back</span>
		</a>

		<a
			href={nextPageUrl}
			draggable="false"
			class={cn(
				'text-muted-foreground-light inline-flex h-full flex-1 items-center justify-center p-0 text-sm font-medium underline-offset-4 hover:underline ',
				!nextPage && 'pointer-events-none opacity-40'
			)}
		>
			Next
			<ChevronRight class="ms-2" />
		</a>
	</div>

	<div class="relative mx-auto h-full w-full overflow-hidden">
		<div
			class="absolute inset-0 m-auto flex"
			style={`width: calc((100dvh - 2.5rem) * ${image.width / image.height}); height: calc((100dvw) * ${image.height / image.width});`}
		>
			<a class="h-full w-[33.3dvw]" href={prevPageUrl} draggable="false">
				<span class="sr-only">Previous page</span>
			</a>
			<a class="h-full flex-grow" href={nextPageUrl} draggable="false">
				<span class="sr-only">Next page</span>
			</a>
		</div>

		<div
			class="absolute inset-0 -z-10 m-auto flex bg-neutral-300 dark:bg-neutral-600"
			style={`width: calc((100dvh - 2.5rem) * ${image.width / image.height}); height: calc((100dvw) * ${image.height / image.width});`}
		/>

		<img
			class="mx-auto h-full w-fit object-contain"
			height={image.height}
			width={image.width}
			alt={`Page ${currentPage}`}
			src={`${env.CDN_URL}/archive/${archive.id}/${currentPage}`}
			loading="eager"
			on:error={() => {
				toast.error('Failed to load the page');
			}}
		/>
	</div>
</div>
