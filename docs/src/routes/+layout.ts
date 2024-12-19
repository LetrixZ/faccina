import type { Component } from 'svelte';

export const load = () => {
	const sections: {
		order: number;
		slug: string;
		title: string;
		pages: { order: number; slug: string; name: string; url: string }[];
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
		}>('../../pages/**/*.md', { eager: true })
	)) {
		const [_, sectionSlug, pageSlug] = path.match(/\/pages\/(.*)\/(.*).md/)!;
		const section = sections.find((section) => section.slug === sectionSlug)!;
		section.pages.push({
			order: metadata.order,
			slug: pageSlug,
			name: metadata.title,
			url: `/${section.slug}/${pageSlug}`
		});
	}

	sections.sort((a, b) => a.order - b.order);
	sections.forEach((section) => section.pages.sort((a, b) => a.order - b.order));

	return { sections };
};

export const prerender = true;
export const trailingSlash = 'always';
