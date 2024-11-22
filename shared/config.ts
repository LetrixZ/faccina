import camelcaseKeys from 'camelcase-keys';
import { parseTOML } from 'confbox';
import { z } from 'zod';

const camelize = <T extends Record<string, unknown> | ReadonlyArray<Record<string, unknown>>>(
	val: T
) => camelcaseKeys(val);

const stringOrStringArray = z
	.union([z.string(), z.array(z.string())])
	.transform((val) => (typeof val === 'string' ? [val] : val));

const tagWeightSchema = z
	.object({
		name: stringOrStringArray,
		namespace: z.string().optional(),
		weight: z.number(),
		ignore_case: z.boolean().default(false).optional(),
	})
	.transform(camelize);

const tagExcludeSchema = z
	.object({
		name: stringOrStringArray,
		namespace: z.string().optional(),
		ignore_case: z.boolean().default(false).optional(),
	})
	.transform(camelize);

const listingSchema = z
	.object({
		tag_weight: z.array(tagWeightSchema).default([]),
		tag_exclude: z.array(tagExcludeSchema).default([]),
		page_limits: z.array(z.number().int()).min(1).catch([24]),
		default_page_limit: z.number().int().optional(),
	})
	.transform(camelize)
	.transform((val) => ({
		...val,
		defaultPageLimit: val.defaultPageLimit
			? (val.pageLimits.find((limit) => limit === val.defaultPageLimit) ?? val.pageLimits[0])
			: val.pageLimits[0],
	}));

const siteSchema = z
	.object({
		site_name: z.string().default('Faccina'),
		url: z.string().optional(),
		enable_users: z.boolean().default(true),
		enable_collections: z.boolean().default(true),
		enable_read_history: z.boolean().default(true),
		enable_analytics: z.boolean().default(true),
		admin_users: z.array(z.string()).default([]),
		default_sort: z
			.enum(['released_at', 'created_at', 'title', 'pages', 'random'])
			.default('released_at'),
		default_order: z.enum(['asc', 'desc']).default('desc'),
		guest_downloads: z.boolean().default(true),
		client_side_downloads: z.boolean().default(true),
		gallery_listing: listingSchema.default({}),
		search_placeholder: z.string().default(''),
		store_og_images: z.boolean().default(true),
		secure_session_cookie: z.boolean().default(true),
	})
	.transform(camelize);

const directoriesSchema = z.object({
	content: z.string(),
	images: z.string(),
});

const databaseSchema = z
	.discriminatedUnion('vendor', [
		z.object({
			vendor: z.literal('sqlite'),
			path: z.string(),
			apply_optimizations: z.boolean().default(true),
		}),
		z.object({
			vendor: z.literal('postgresql'),
			user: z.string(),
			database: z.string(),
			password: z.string(),
			host: z.string().default('localhost'),
			port: z.number().default(5432),
		}),
	])
	.transform(camelize);

const tagMappingSchema = z
	.object({
		match: stringOrStringArray,
		match_namespace: z.string().optional(),
		namespace: z.string().optional(),
		name: z.string().optional(),
		ignore_case: z.boolean().default(false).optional(),
	})
	.transform(camelize);

const sourceMappingSchema = z
	.object({
		match: z.string(),
		name: z.string(),
		ignore_case: z.boolean().default(false).optional(),
	})
	.transform(camelize);

type SourceMapping = z.infer<typeof sourceMappingSchema>;

const defaultSourceMappings: SourceMapping[] = [
	{ match: 'anchira', name: 'Anchira', ignoreCase: true },
	{ match: 'e-hentai', name: 'E-Hentai', ignoreCase: true },
	{ match: 'exhentai', name: 'ExHentai', ignoreCase: true },
	{ match: 'fakku', name: 'FAKKU', ignoreCase: true },
	{ match: 'irodori', name: 'Irodori Comics', ignoreCase: true },
	{ match: 'koharu', name: 'Koharu', ignoreCase: true },
	{ match: 'hentainexus', name: 'HentaiNexus', ignoreCase: true },
	{ match: 'hentai-nexus', name: 'HentaiNexus', ignoreCase: true },
	{ match: 'hentag', name: 'HenTag', ignoreCase: true },
	{ match: 'patreon', name: 'Patreon', ignoreCase: true },
	{ match: 'pixiv', name: 'Pixiv', ignoreCase: true },
	{ match: 'projecth', name: 'Project Hentai', ignoreCase: true },
	{ match: 'projectxxx', name: 'Project Hentai', ignoreCase: true },
	{ match: 'project-xxx', name: 'Project Hentai', ignoreCase: true },
	{ match: 'schale', name: 'Koharu', ignoreCase: true },
];

const metadataSchema = z
	.object({
		parse_filename_as_title: z.boolean().default(true),
		tag_mapping: z.array(tagMappingSchema).default([]),
		source_mapping: z
			.array(sourceMappingSchema)
			.default([])
			.transform((val) =>
				val.concat(defaultSourceMappings).reduce((sources, source) => {
					const existingSource = sources.find((s) => s.match === source.match);

					if (existingSource) {
						return sources;
					}
					return [...sources, source];
				}, [] as SourceMapping[])
			),
	})
	.transform(camelize);

const presetSchema = z
	.discriminatedUnion('format', [
		z.object({
			format: z.literal('webp'),
			quality: z.number().min(1).max(100).optional(),
			lossless: z.boolean().optional(),
			near_lossless: z.boolean().optional(),
			effort: z.number().min(0).max(6).optional(),
		}),
		z.object({
			format: z.literal('jpeg'),
			quality: z.number().min(1).max(100).optional(),
			progressive: z.boolean().optional(),
		}),
		z.object({
			format: z.literal('png'),
			progressive: z.boolean().optional(),
			effort: z.number().min(1).max(10).optional(),
			compression_level: z.number().min(0).max(9).optional(),
		}),
		z.object({
			format: z.literal('jxl'),
			quality: z.number().min(1).max(100).optional(),
			lossless: z.boolean().optional(),
			effort: z.number().min(3).max(9).optional(),
			distance: z.number().min(0).max(15).optional(),
		}),
		z.object({
			format: z.literal('avif'),
			quality: z.number().min(1).max(100).optional(),
			lossless: z.boolean().optional(),
			effort: z.number().min(0).max(9).optional(),
		}),
	])
	.transform(camelize)
	.and(z.object({ width: z.number() }));

const imageSchema = z
	.object({
		cover_preset: z.string().default('cover'),
		thumbnail_preset: z.string().default('thumbnail'),
		aspect_ratio_similar: z.boolean().default(true),
		remove_on_update: z.boolean().default(true),
		preset: z.record(z.string(), presetSchema).default({}),
	})
	.transform(camelize)
	.superRefine((val, ctx) => {
		if (val.coverPreset === 'cover') {
			if (!val.preset || !('cover' in val.preset)) {
				val.preset = {
					...val.preset,
					cover: {
						format: 'webp',
						width: 540,
					},
				};
			}
		} else {
			if (!val.preset || !(val.coverPreset in val.preset)) {
				ctx.addIssue({
					code: 'custom',
					path: ['encoding', 'preset'],
					message: `Preset '${val.coverPreset}' was not defined as a preset`,
				});
			}
		}

		if (val.thumbnailPreset === 'thumbnail') {
			if (!val.preset || !('thumbnail' in val.preset)) {
				val.preset = {
					...val.preset,
					thumbnail: {
						format: 'webp',
						width: 360,
					},
				};
			}
		} else {
			if (!val.preset || !(val.thumbnailPreset in val.preset)) {
				ctx.addIssue({
					code: 'custom',
					path: ['encoding', 'preset'],
					message: `Preset '${val.thumbnailPreset}' was not defined as a preset`,
				});
			}
		}
	})
	.transform((val) => ({
		...val,
		preset: Object.entries(val.preset).reduce(
			(acc, [name, preset]) => ({ ...acc, [name]: { ...preset, name } }),
			{} as { [key: string]: Preset }
		),
	}))
	.transform((val) => ({
		...val,
		coverPreset: val.preset[val.coverPreset],
		thumbnailPreset: val.preset[val.thumbnailPreset],
		preset: val.preset,
	}));

const mailerSchema = z.object({
	host: z.string(),
	port: z.number(),
	secure: z.boolean(),
	user: z.string().optional(),
	pass: z.string().optional(),
	from: z.string(),
});

const configSchema = z.object({
	site: siteSchema.default({}),
	directories: directoriesSchema,
	database: databaseSchema,
	metadata: metadataSchema.default({}),
	image: imageSchema.default({}),
	mailer: mailerSchema.optional(),
});

export default await (async () => {
	try {
		const { building } = await import('$app/environment');

		if (building) {
			return configSchema.parse({
				database: {
					vendor: 'sqlite',
					path: ':memory:',
				},
				directories: {
					content: '/tmp',
					images: '/tmp',
				},
			});
		}
	} catch {
		/* empty */
	}

	const configFile = process.env.CONFIG_FILE ?? 'config.toml';
	const file = Bun.file(configFile);

	if (!(await file.exists())) {
		throw new Error('No configuration file found.');
	}

	const content = await file.text();

	return configSchema.parse(parseTOML(content));
})();

export type Preset = z.infer<typeof presetSchema> & { name: string };
export type DatabaseVendor = z.infer<typeof databaseSchema>['vendor'];
