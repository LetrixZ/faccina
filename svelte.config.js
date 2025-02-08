import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import nodeAdapter from '@sveltejs/adapter-node';
import bunAdapter from 'svelte-adapter-bun';

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
		adapter:
			typeof Bun !== 'undefined'
				? bunAdapter({ reusePort: true })
				: nodeAdapter({ reusePort: true }),
		alias: {
			'~shared': './shared/',
		},
		csrf: false,
	},
};

export default config;
