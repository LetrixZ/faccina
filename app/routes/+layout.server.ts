import config from '~shared/config';
import type { SiteConfig } from '$lib/types';

export const load = ({ locals }) => {
	return {
		user: locals.user,
		site: {
			name: config.site.siteName,
			url: config.site.url,
			enableUsers: config.site.enableUsers,
			disableRegistration: config.site.disableRegistration,
			enableCollections: config.site.enableCollections,
			enableReadHistory: config.site.enableReadHistory,
			hasMailer: !!config.mailer,
			defaultSort: config.site.defaultSort,
			defaultOrder: config.site.defaultOrder,
			guestDownloads: config.site.guestDownloads,
			guestAccess: config.site.guestAccess,
			clientSideDownloads: config.site.clientSideDownloads,
			searchPlaceholder: config.site.searchPlaceholder,
			pageLimits: config.site.galleryListing.pageLimits,
			defaultPageLimit: config.site.galleryListing.defaultPageLimit,
			imageServer: config.site.imageServer,
			admin: {
				deleteRequireConfirmation: config.site.admin.deleteRequireConfirmation,
			},
		} satisfies SiteConfig,
	};
};
