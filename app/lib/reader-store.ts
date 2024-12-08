import { writable } from 'svelte/store';
import type { Gallery } from './types';
import { preferencesSchema, type ReaderPreferences } from './utils';
import type { Preset } from './image-presets';

export const showBar = writable(true);

export const currentArchive = writable<Gallery | undefined>();

export const preferencesOpen = writable(false);
export const previewLayout = writable(false);

export const readerPage = writable<number | undefined>();
export const prevPage = writable<number | undefined>();
export const nextPage = writable<number | undefined>();

export const prefs = writable<ReaderPreferences>(preferencesSchema.parse({}) as ReaderPreferences);

export const readerTimeout = (() => {
	let timeout: NodeJS.Timeout | undefined;

	const clear = () => clearTimeout(timeout);
	const reset = () => {
		clear();

		timeout = setTimeout(() => {
			showBar.set(false);
		}, 3000);
	};

	return { reset, clear };
})();

export const presets = writable<Preset[]>([]);
export const defaultPreset = writable<string | undefined>(undefined);
export const allowOriginal = writable(true);
