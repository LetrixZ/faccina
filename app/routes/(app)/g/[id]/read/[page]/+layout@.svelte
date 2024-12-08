<script lang="ts">
	import cookie from 'cookie';
	import { onMount } from 'svelte';
	import ReaderBar from '$lib/components/reader-bar.svelte';
	import { TouchLayout } from '$lib/models';
	import { allowOriginal, defaultPreset, prefs, presets } from '$lib/reader-store';
	import type { ReaderPreferences } from '$lib/utils';

	export let data;

	presets.set(data.presets);
	defaultPreset.set(data.defaultPreset);
	allowOriginal.set(data.allowOriginal);

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

			if ($prefs.preset === undefined) {
				let preset = $defaultPreset;

				if (preset === undefined && !$allowOriginal) {
					preset = $presets[0].name;
				}

				$prefs.preset = preset;
			} else {
				if (!$presets.some((preset) => preset.name === $prefs.preset)) {
					if (!$allowOriginal) {
						$prefs.preset = $presets[0].name;
					} else {
						$prefs.preset = undefined;
					}
				}
			}
		}
	});
</script>

{#if isMounted}
	<ReaderBar gallery={data.gallery} />

	<slot />
{/if}
