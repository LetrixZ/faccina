import config from '~shared/config';

export const load = ({ locals }) => {
	const siteConfig = config.site;

	return {
		user: locals.user,
		site: {
			name: siteConfig.siteName,
			enableUsers: siteConfig.enableUsers,
		},
	};
};
