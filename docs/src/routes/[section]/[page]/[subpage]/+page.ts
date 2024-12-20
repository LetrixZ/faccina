import { error } from '@sveltejs/kit';
import type { Component, SvelteComponent } from 'svelte';

export const load = async ({ params }) => {
	try {
		const { default: Content, metadata }: { default: Component; metadata: { title: string } } =
			await import(`../../../../../pages/${params.section}/${params.page}/${params.subpage}.md`);

		return { Content, metadata };
	} catch {
		error(404, { message: 'Page not found' });
	}
};
