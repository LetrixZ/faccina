import { SvelteMap } from 'svelte/reactivity';

export type Preferences = {
	disableLayoutColors: boolean;
};

const defaultPreferences: Preferences = {
	disableLayoutColors: false,
};

export class AppState {
	colors = new SvelteMap<number, string>();
	currentGallery = $state<number>();
	preferences = $state(defaultPreferences);
}

export const appState = new AppState();
