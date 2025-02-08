import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

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

		if (!path) {
			return null;
		}

		const data = await Bun.file(path).bytes();
		// @ts-expect-error works
		const hex = data.toHex();

		return `export default '${hex}';`;
	},
};

export default defineConfig({
	server: { fs: { allow: ['app', 'shared/utils.ts', 'shared/config'] } },
	plugins: [hexLoader, sveltekit()],
	define: { PKG: pkg },
});
