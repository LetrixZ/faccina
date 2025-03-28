<script lang="ts">
	import { readerState } from './reader.svelte.js';
	import type { ReaderPreset } from '~shared/config/image.schema';

	const { data, children } = $props();

	$effect(() => {
		let defaultPreset: ReaderPreset | null | undefined = data.defaultPreset;

		if (!defaultPreset) {
			if (data.readerAllowOriginal) {
				defaultPreset = null;
			} else if (data.presets[0]) {
				defaultPreset = data.presets[0];
			}
		}

		readerState.init(data.defaultPreset);
	});
</script>

{#if readerState.initialized}
	{@render children()}
{/if}
