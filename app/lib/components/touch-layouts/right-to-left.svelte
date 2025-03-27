<script lang="ts">
	import { page } from '$app/stores';
	import { nextPage, previewLayout, prevPage, showBar } from '$lib/reader-store';
	import { cn } from '$lib/utils';

	export let changePage: (page: number | undefined) => void;

	$: prevPageUrl = $prevPage ? `${$prevPage}${$page.url.search}` : undefined;
	$: nextPageUrl = $nextPage ? `${$nextPage}${$page.url.search}` : undefined;
</script>

<a
	class={cn('relative h-full flex-grow outline-none', $previewLayout && 'bg-red-500/50 ')}
	draggable="false"
	href={nextPageUrl}
	on:click|preventDefault={() => changePage($nextPage)}
>
	<span class="sr-only"> Next page </span>

	{#if $previewLayout}
		<span
			class="stroke absolute inset-0 m-auto h-fit w-fit rounded-md text-2xl font-semibold tracking-wider uppercase"
		>
			Next
		</span>
	{/if}
</a>
<button
	class="h-full max-w-56 min-w-24 basis-[17.5%] outline-none"
	on:click={() => ($showBar = !$showBar)}
/>
<a
	class={cn('relative h-full flex-grow outline-none', $previewLayout && 'bg-blue-500/50')}
	draggable="false"
	href={prevPageUrl}
	on:click|preventDefault={() => changePage($prevPage)}
>
	<span class="sr-only"> Previous page </span>

	{#if $previewLayout}
		<span
			class="stroke absolute inset-0 m-auto h-fit w-fit rounded-md text-2xl font-semibold tracking-wider uppercase"
		>
			Prev
		</span>
	{/if}
</a>
