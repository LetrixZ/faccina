import type { Component } from 'svelte';

export const load = async () => {
	const { default: Content, metadata }: { default: Component; metadata: { title: string } } =
		// @ts-expect-error works
		await import(`../../pages/introduction.md`);

	return { Content, metadata };
};
