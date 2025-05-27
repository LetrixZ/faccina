import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const pkg = JSON.parse(json);

export default defineConfig({
	server: { fs: { allow: ['app', 'shared/utils.ts', 'shared/config'] } },
	plugins: [sveltekit()],
	define: { PKG: pkg },
});
