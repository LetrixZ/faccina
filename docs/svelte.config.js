import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import remarkAutolinkHeadings from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';
import remarkSectionize from 'remark-sectionize';
import remarkHeadingId from 'remark-heading-id';
import rehypePrettyCode from 'rehype-pretty-code';

const getHeadings = () => {
	return (tree, vFile) => {
		const headers = [];

		for (const element of tree.children) {
			if (element.type === 'heading' && element.depth > 1) {
				const id = element.data.id;
				const name = element.children.find(({ type }) => type === 'text').value;

				let parent = undefined;

				if (element.depth === 3) {
					parent = headers.find(({ depth }) => depth === 2);
				}

				const header = {
					id,
					name,
					depth: element.depth,
					subHeaders: []
				};

				if (parent) {
					parent.subHeaders.push(header);
				} else {
					headers.push(header);
				}
			}
		}

		vFile.data.fm.headers = headers;
	};
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			highlight: false,
			rehypePlugins: [
				[rehypePrettyCode, { theme: 'tokyo-night' }],
				[remarkAutolinkHeadings, { behavior: 'wrap' }],
				[rehypeExternalLinks, { target: '_blank' }]
			],
			remarkPlugins: [
				[remarkHeadingId, { defaults: true, uniqueDefaults: true }],
				getHeadings,
				remarkSectionize
			]
		})
	],
	kit: {
		adapter: adapter(),
		paths: {
			base: process.argv.includes('dev') ? '' : process.env.BASE_PATH
		},
		alias: {
			shared: '../shared'
		}
	},
	extensions: ['.svelte', '.md']
};

export default config;
