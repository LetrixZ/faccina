<script lang="ts">
	import ReaderBar from '$lib/components/reader-bar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import cookie from 'cookie';
	import { onMount } from 'svelte';
	import '~/app.pcss';
	import { prefs } from '~/lib/reader-store';
	import type { ReaderPreferences } from '~/lib/utils';

	let isMounted = false;

	onMount(() => {
		const cookiePerfs = cookie.parse(document.cookie);

		if (Object.entries(cookiePerfs).length) {
			try {
				$prefs = JSON.parse(cookiePerfs.reader) as ReaderPreferences;
			} finally {
				isMounted = true;
			}
		} else {
			isMounted = true;
		}
	});
</script>

<Toaster richColors position="top-right" />

{#if isMounted}
	<ReaderBar />

	<slot></slot>
{/if}
