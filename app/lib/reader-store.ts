import { writable } from 'svelte/store';
import type { Preset } from './image-presets';
import type { Gallery } from './types';
import { preferencesSchema, type ReaderPreferences } from './utils';

export const showBar = writable(true);

export const currentArchive = writable<Gallery | undefined>();

export const previewLayout = writable(false);

export const readerPage = writable<number | undefined>();
export const prevPage = writable<number | undefined>();
export const nextPage = writable<number | undefined>();

export const presets = writable<Preset[]>([]);
export const defaultPreset = writable<Preset | undefined>(undefined);
export const allowOriginal = writable(true);

export const prefs = writable<ReaderPreferences>(preferencesSchema.parse({}) as ReaderPreferences);

export const readerTimeout = (() => {
	let timeout: Timer;

	const clear = () => clearTimeout(timeout);
	const reset = () => {
		clear();

		timeout = setTimeout(() => {
			showBar.set(false);
		}, 3000);
	};

	return { reset, clear };
})();
