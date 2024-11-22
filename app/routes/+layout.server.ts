import type { LayoutServerLoad } from './$types';
import type { SiteConfig } from '$lib/types';
import config from '~shared/config';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		user: locals.user,
		site: {
			name: config.site.siteName,
			url: config.site.url,
			enableUsers: config.site.enableUsers,
			enableCollections: config.site.enableCollections,
			enableReadHistory: config.site.enableReadHistory,
			hasMailer: !!config.mailer,
			defaultSort: config.site.defaultSort,
			defaultOrder: config.site.defaultOrder,
			guestDownloads: config.site.guestDownloads,
			clientSideDownloads: config.site.clientSideDownloads,
			searchPlaceholder: config.site.searchPlaceholder,
			pageLimits: config.site.galleryListing.pageLimits,
			defaultPageLimit: config.site.galleryListing.defaultPageLimit,
		} satisfies SiteConfig,
	};
};
