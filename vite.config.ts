import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: { fs: { allow: ['app'] } },
	plugins: [sveltekit(), Icons({ compiler: 'svelte' })],
});
