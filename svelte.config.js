import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-static';

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
			pages: './go/web/build',
		}),
		alias: {
			'~shared': './shared/',
		},
		csrf: false,
	},
};

export default config;
