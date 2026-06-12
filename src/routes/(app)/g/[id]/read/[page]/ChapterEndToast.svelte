<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Gallery } from '$lib/types.js';

	let {
		gallery,
		onBack
	}: {
		gallery: Gallery;
		onBack?: () => void;
	} = $props();
</script>

<div class="flex items-center justify-between">
	<span> End of chapter </span>
	<Button
		class="h-fit py-0"
		href="/g/{gallery.id}{$page.url.search}"
		onclick={(ev) => {
			ev.preventDefault();
			onBack?.();
		}}
		variant="link"
	>
		Go back
	</Button>
</div>
