import { svelte } from '@sveltejs/vite-plugin-svelte';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	define: {
		'import.meta.env.VITE_SERVER_URL': JSON.stringify(process.env.SERVER_URL),
	},
	plugins: [svelte(), Icons({ compiler: 'svelte' }), tsconfigPaths()],
});
