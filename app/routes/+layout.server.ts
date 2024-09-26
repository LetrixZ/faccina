import config from '~shared/config';

export const load = ({ locals }) => {
	return {
		user: locals.user,
		site: {
			name: config.site.siteName,
			enableUsers: config.site.enableUsers,
			canRecover: !!config.mailer,
		},
	};
};
