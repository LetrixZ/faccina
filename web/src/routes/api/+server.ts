import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const version = await fetch(`${env.SERVER_URL}`).then((res) => res.text());

	return new Response(version, { status: 200 });
};
