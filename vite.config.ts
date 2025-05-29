import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const pkg = JSON.parse(json);

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
	plugins: [sveltekit()],
	define: { PKG: pkg },
});
