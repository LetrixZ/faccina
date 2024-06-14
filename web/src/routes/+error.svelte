<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
</script>

<div class="absolute inset-x-0 top-52 m-auto flex h-fit w-fit flex-col">
	<p class="text-5xl font-extralight">{$page.error?.status}</p>
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
