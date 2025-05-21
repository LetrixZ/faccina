import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
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
		const hex = data.toHex();

		return `export default '${hex}';`;
	},
};

export default defineConfig({
	server: {
		fs: { allow: ['app', 'shared/utils.ts', 'shared/config'] },
		proxy: {
			'/internal': {
				target: process.env.PUBLIC_API_URL,
				changeOrigin: true,
			},
			'/image': {
				target: process.env.PUBLIC_API_URL,
				changeOrigin: true,
			},
			'/api': {
				target: process.env.PUBLIC_API_URL,
				changeOrigin: true,
			},
		},
	},
	plugins: [hexLoader, tailwindcss(), sveltekit()],
	define: { PKG: pkg },
	build: {
		rollupOptions: {
			external: ['Bun', 'bun'],
		},
	},
});
