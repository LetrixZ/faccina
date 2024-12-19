import { error } from '@sveltejs/kit';
import type { Component, SvelteComponent } from 'svelte';

export const load = async ({ params }) => {
	try {
		const doc: { default: Component } = await import(
			`../../../../pages/${params.section}/${params.page}.md`
		);

		return { Content: doc.default };
	} catch {
		error(404, { message: 'Page not found' });
	}
};
