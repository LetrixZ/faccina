<script lang="ts">
	import { page } from '$app/stores';
	import { Button, Separator } from 'shared';
</script>

<div class="absolute inset-x-0 top-52 m-auto flex h-fit w-fit flex-col">
	{#if $page.error?.status}
		<p class="text-5xl font-extralight">{$page.error.status}</p>
	{/if}
	<p class="text-4xl font-medium">
		{$page.error?.message}
	</p>

	<Separator class="my-4" />

	<Button
		href="/"
		variant="outline"
		class="mb-4 h-12 w-full text-lg"
		data-sveltekit-preload-data="off">Go home</Button
	>
</div>
