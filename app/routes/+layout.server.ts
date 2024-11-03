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
			hasMailer: !!config.mailer,
			defaultSort: config.site.defaultSort,
			defaultOrder: config.site.defaultOrder,
			guestDownloads: config.site.guestDownloads,
			searchPlaceholder: config.site.searchPlaceholder,
			pageLimits: config.site.galleryListing.pageLimits,
		} satisfies SiteConfig,
	};
};
