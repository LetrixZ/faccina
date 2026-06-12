import { redirect } from '@sveltejs/kit';

export const load = ({ params, url }) => {
	redirect(301, `/g/${params.id}/read/1${url.search}`);
};
