import { json } from '@sveltejs/kit';
import config from '~shared/config';

declare const PKG: {
	version: string;
};

export const GET = () => {
	return json({ message: config.site.siteName, version: PKG.version });
};
