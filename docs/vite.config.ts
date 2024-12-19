import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: { port: 5174, fs: { allow: ['../'] } },
	plugins: [sveltekit()]
});
