import type { Navigation } from '@sveltejs/kit';

export const POST = async ({ locals, request }) => {
	const data = (await request.json()) as Navigation;

	locals.analytics?.postMessage({
		action: 'app_navigation',
		payload: data,
	});

	return new Response();
};
