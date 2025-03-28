<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { Gallery } from '$lib/types';

	type Props = {
		gallery: Gallery;
		onBack: () => void;
	};

	let { gallery, onBack }: Props = $props();
</script>

<div class="flex items-center justify-between">
	<span> End of chapter </span>
	<Button
		class="h-fit py-0"
		href="/g/{gallery.id}{page.url.search}"
		onclick={(ev) => {
			ev.preventDefault();
			onBack();
		}}
		variant="link"
	>
		Go back
	</Button>
</div>
