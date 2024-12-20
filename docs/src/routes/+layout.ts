import { base } from '$app/paths';
import type { Component } from 'svelte';

type Page = {
	order: number;
	slug: string;
	name: string;
	url: string;
};

type MainPage = Page & { subpages: Page[] };

export const load = () => {
	const sections: {
		order: number;
		slug: string;
		title: string;
		pages: MainPage[];
	}[] = [];

	for (const [path, { title, order }] of Object.entries(
		import.meta.glob<{ order: number; title: string }>('../../pages/**/meta.json', { eager: true })
	)) {
		const [_, slug] = path.match(/\/pages\/(.*)\/meta.json/)!;
		sections.push({ order, title, slug, pages: [] });
	}

	for (const [path, { metadata }] of Object.entries(
		import.meta.glob<{
			default: Component;
			metadata: { order: number; title: string };
		}>('../../pages/*/*.md', { eager: true })
	)) {
		const [_, sectionSlug, pageSlug] = path.match(/\/pages\/(.*)\/(.*).md/)!;
		const section = sections.find((section) => section.slug === sectionSlug)!;
		const page: MainPage = {
			order: metadata.order,
			slug: pageSlug,
			name: metadata.title,
			url: `${base}/${section.slug}/${pageSlug}`,
			subpages: []
		};
		section.pages.push(page);

		for (const [path, { metadata }] of Object.entries(
			import.meta.glob<{
				default: Component;
				metadata: { order: number; title: string };
			}>(`../../pages/*/*/*.md`, { eager: true })
		)) {
			const match = path.match(/\/pages\/.*\/(.*)\/(.*).md/)!;

			if (match[1] === pageSlug) {
				page.subpages.push({
					order: metadata.order,
					name: metadata.title,
					slug: match[2],
					url: `${page.url}/${match[2]}`
				});
			}
		}
	}

	sections.sort((a, b) => a.order - b.order);
	sections.forEach((section) => section.pages.sort((a, b) => a.order - b.order));

	return { sections };
};

export const prerender = true;
