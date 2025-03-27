import { stringOrStringArray } from './common';
import { orderTypes, sortTypes } from './sort';
import { z } from 'zod';

const usernameSchema = z
	.string()
	.trim()
	.min(4, 'Username must contain at least 4 characters')
	.max(32, 'Username cannot contain more than 32 characters')
	.regex(/^[a-z0+-9_-]+$/, 'Username must be lowercase and can contain only letters and numbers');

const tagWeightSchema = z.object({
	name: stringOrStringArray.optional(),
	namespace: z.string().optional(),
	weight: z.number(),
	ignore_case: z.boolean().default(false).optional(),
});

const tagExcludeSchema = z.object({
	name: stringOrStringArray.optional(),
	namespace: z.string().optional(),
	ignore_case: z.boolean().default(false).optional(),
});

const listingSchema = z
	.object({
		page_limits: z.array(z.number().int()).min(1).catch([24]),
		default_page_limit: z.number().int().optional(),
		tag_weight: z.array(tagWeightSchema).default([]),
		tag_exclude: z.array(tagExcludeSchema).default([]),
		use_default_tag_weight: z.boolean().default(true),
		use_default_tag_exclude: z.boolean().default(true),
	})
	.transform((val) => ({
		...val,
		default_page_limit: val.default_page_limit
			? (val.page_limits.find((limit) => limit === val.default_page_limit) ?? val.page_limits[0])!
			: val.page_limits[0]!,
		tag_weight: val.use_default_tag_weight
			? [
					{ namespace: 'artist', weight: 1000 },
					{ namespace: 'circle', weight: 999 },
					{ namespace: 'parody', weight: 998 },
					...val.tag_weight,
				]
			: val.tag_weight,
		tag_exclude: val.use_default_tag_exclude
			? [
					{ namespace: 'parody', name: ['original', 'original work'], ignore_case: true },
					{ namespace: 'magazine' },
					{ namespace: 'event' },
					{ namespace: 'publisher' },
					...val.tag_exclude,
				]
			: val.tag_exclude,
	}));

const schema = z.object({
	site_name: z.string().default('Faccina'),
	url: z.string().default(''),
	enable_users: z.boolean().default(true),
	enable_collections: z.boolean().default(true),
	enable_read_history: z.boolean().default(true),
	admin_users: z.array(usernameSchema).default([]),
	default_sort: z.enum(sortTypes).default('released_at'),
	default_order: z.enum(orderTypes).default('desc'),
	guest_access: z.boolean().default(true),
	guest_downloads: z.boolean().default(true),
	client_side_downloads: z.boolean().default(true),
	search_placeholder: z.string().default(''),
	secure_session_cookie: z.boolean().default(false),
	store_og_images: z.boolean().default(false),
	image_server: z.string().default(''),
	admin: z
		.object({
			delete_require_confirmation: z.boolean().default(true),
		})
		.default({}),
	gallery_listing: listingSchema.default({}),
});

export default schema;
