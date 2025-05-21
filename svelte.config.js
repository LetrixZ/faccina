import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

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
			fallback: 'index.html',
			pages: './web/build',
		}),
		alias: {
			'~shared': './shared/',
		},
		csrf: false,
	},
};

export default config;
