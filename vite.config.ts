import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'fs';
import Icons from 'unplugin-icons/vite';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const pkg = JSON.parse(json);

export default defineConfig({
	server: { fs: { allow: ['app'] } },
	plugins: [sveltekit(), Icons({ compiler: 'svelte' })],
	define: {
		PKG: pkg,
	},
});
