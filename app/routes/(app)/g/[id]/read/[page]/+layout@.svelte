<script lang="ts">
	import type { ReaderPreferences } from '$lib/utils';

	import ReaderBar from '$lib/components/reader-bar.svelte';
	import { TouchLayout } from '$lib/models';
	import { prefs } from '$lib/reader-store';
	import cookie from 'cookie';
	import { onMount } from 'svelte';

	let isMounted = false;

	onMount(() => {
		const cookiePerfs = cookie.parse(document.cookie);

		isMounted = true;

		if (Object.entries(cookiePerfs).length) {
			if (cookiePerfs.reader) {
				$prefs = JSON.parse(cookiePerfs.reader) as ReaderPreferences;
			}

			if ($prefs.touchLayout === undefined) {
				$prefs.touchLayout = TouchLayout.LeftToRight;
			}
		}
	});
</script>

{#if isMounted}
	<ReaderBar />

	<slot />
{/if}
