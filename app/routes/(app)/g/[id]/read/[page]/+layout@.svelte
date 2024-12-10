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
		}

		if ($prefs.touchLayout === undefined) {
			$prefs.touchLayout = TouchLayout.LeftToRight;
		}

		if ($prefs.preset === undefined) {
			let preset = $defaultPreset?.hash;

			if (preset === undefined) {
				if ($allowOriginal) {
					preset = '[original]';
				} else if ($presets[0]) {
					preset = $presets[0].hash;
				}
			}

			$prefs.preset = preset;
		} else {
			const preset = $presets.find((p) => p.hash === $prefs.preset || p.name === $prefs.preset);

			if (preset) {
				$prefs.preset = preset.hash;
			} else if ($defaultPreset) {
				$prefs.preset = $defaultPreset.hash;
			} else if ($allowOriginal) {
				$prefs.preset = '[original]';
			} else if ($presets[0]) {
				$prefs.preset = $presets[0].hash;
			}
		}
	});
</script>

{#if isMounted}
	<ReaderBar gallery={data.gallery} />

	<slot />
{/if}
