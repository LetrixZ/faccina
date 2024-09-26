import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from 'svelte-adapter-bun';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		files: {
			appTemplate: 'app/app.html',
			errorTemplate: 'app/error.html',
			lib: 'app/lib',
			routes: 'app/routes',
			hooks: {
				server: 'app/hooks.server.ts',
			},
		},
		adapter: adapter({
			precompress: true,
		}),
		alias: {
			'~': './app',
			$assets: './app/assets',
			'~shared': './shared/',
		},
		csrf: false,
	},
};

export default config;
