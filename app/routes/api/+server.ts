import { json } from '@sveltejs/kit';
import config from '~shared/config';

export const GET = () => {
	return json({ message: config.site.siteName, version: '2.0.0-alpha' });
};
