<script lang="ts">
	import { run } from 'svelte/legacy';
	import { navigating } from '$app/stores';
	import { Toaster } from '$lib/components/ui/sonner';
	import { siteConfig } from '$lib/stores';
	import '../app.pcss';

	let { data, children } = $props();

	run(() => {
		if ($navigating) {
			fetch('/stats', {
				method: 'POST',
				body: JSON.stringify($navigating),
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}
	});

	run(() => {
		$siteConfig = data.site;
	});
</script>

<Toaster position="bottom-center" richColors />

{@render children?.()}
