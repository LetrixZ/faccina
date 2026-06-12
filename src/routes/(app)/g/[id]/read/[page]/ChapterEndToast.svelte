<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { Gallery } from '$lib/types';

	export let gallery: Gallery;
	export let onBack: () => void;
</script>

<div class="flex items-center justify-between">
	<span> End of chapter </span>
	<Button
		class="h-fit py-0"
		href="/g/{gallery.id}{$page.url.search}"
		on:click={(ev) => {
			ev.preventDefault();
			onBack();
		}}
		variant="link"
	>
		Go back
	</Button>
</div>
