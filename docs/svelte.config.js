import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import toc from 'remark-toc';
import sectionize from 'remark-sectionize';
import slug from 'rehype-slug';
import autolinkHeading from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			rehypePlugins: [
				slug,
				[autolinkHeading, { behavior: 'wrap' }],
				[rehypeExternalLinks, { target: '_blank' }]
			],
			remarkPlugins: [toc, sectionize]
		})
	],
	kit: {
		adapter: adapter(),
		paths: {
			base: process.argv.includes('dev') ? '' : process.env.BASE_PATH
		}
	},
	extensions: ['.svelte', '.md']
};

export default config;
