<script lang="ts">
	import { readerStore } from './reader';
	import type { ReaderPreset } from '~shared/config/image.schema';

	export let data;

	$: {
		let defaultPreset: ReaderPreset | null | undefined = data.defaultPreset;

		if (!defaultPreset) {
			if (data.readerAllowOriginal) {
				defaultPreset = null;
			} else if (data.presets[0]) {
				defaultPreset = data.presets[0];
			}
		}

		readerStore.init(data.defaultPreset);
	}
</script>

{#if $readerStore}
	<slot />
{/if}
