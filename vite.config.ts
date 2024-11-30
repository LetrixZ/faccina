import { readFileSync } from 'fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import Icons from 'unplugin-icons/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, Plugin } from 'vite';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const pkg = JSON.parse(json);

const hexLoader: Plugin = {
	name: 'hex-loader',
	async transform(_code, id: string) {
		const [path, query] = id.split('?');

		if (query != 'raw-hex') {
			return null;
		}

		const hex = await readFile(path, 'hex');

		return `export default '${hex}';`;
	},
};

export default defineConfig({
	server: { fs: { allow: ['app'] } },
	plugins: [hexLoader, sveltekit(), Icons({ compiler: 'svelte' })],
	define: {
		PKG: pkg,
	},
	build: {
		rollupOptions: {
			external: ['@resvg/resvg-js', 'css-tree'],
		},
	},
});
