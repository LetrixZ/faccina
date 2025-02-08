import { json } from '@sveltejs/kit';

export const GET = () => {
	return json({ error: 'Route not found' }, { status: 404 });
};
