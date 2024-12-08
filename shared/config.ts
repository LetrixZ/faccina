import { readFileSync } from 'fs';
import camelcaseKeys from 'camelcase-keys';
import { parseTOML } from 'confbox';
import { omit } from 'ramda';
import { z } from 'zod';
import { presetSchema, type Preset } from '../app/lib/image-presets';

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

const siteAdminSchema = z
	.object({
		delete_require_confirmation: z.boolean().default(true),
	})
	.transform(camelize);

const siteSchema = z
	.object({
		site_name: z.string().default('Faccina'),
		url: z.string().optional(),
		enable_users: z.boolean().default(true),
		enable_collections: z.boolean().default(true),
		enable_read_history: z.boolean().default(true),
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
		admin: siteAdminSchema.default({}),
	})
	.transform(camelize);

const serverSchema = z
	.object({
		logging: z.union([z.boolean(), z.string()]).default(false),
		auto_unpack: z.boolean().default(false),
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
			enable_fts: z.boolean().default(false),
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
		default_language: z.string().optional(),
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

const cachingSchema = z.object({
	page: z.number().default(365 * 24 * 3600),
	thumbnail: z.number().default(2 * 24 * 3600),
	cover: z.number().default(5 * 24 * 3600),
});

const imageSchema = z
	.object({
		cover_preset: z.string().default('cover'),
		thumbnail_preset: z.string().default('thumbnail'),
		aspect_ratio_similar: z.boolean().default(true),
		remove_on_update: z.boolean().default(true),
		preset: z.record(z.string(), presetSchema).default({}),
		reader_presets: z.array(z.string()).default([]),
		reader_default_preset: z.string().optional(),
		reader_allow_original: z.boolean().default(true),
		caching: z
			.union([z.boolean(), z.number(), cachingSchema])
			.optional()
			.default(true)
			.transform((val) => {
				if (typeof val === 'boolean' && val === true) {
					return cachingSchema.parse({});
				} else if (typeof val === 'number') {
					return cachingSchema.parse({ page: val, thumbnail: val, cover: val });
				}

				return val;
			}),
	})
	.transform(camelize)
	.superRefine((val, ctx) => {
		if (val.coverPreset === 'cover' && (!val.preset || !('cover' in val.preset))) {
			val.preset = {
				...val.preset,
				cover: {
					format: 'webp',
					width: 540,
					label: 'Cover',
				},
			};
		} else if (!val.preset || !(val.coverPreset in val.preset)) {
			ctx.addIssue({
				code: 'custom',
				path: ['encoding', 'preset'],
				message: `Preset '${val.coverPreset}' was not defined as a preset`,
			});
		}

		if (val.thumbnailPreset === 'thumbnail' && (!val.preset || !('thumbnail' in val.preset))) {
			val.preset = {
				...val.preset,
				thumbnail: {
					format: 'webp',
					width: 360,
					label: 'Thumbnail',
				},
			};
		} else if (!val.preset || !(val.thumbnailPreset in val.preset)) {
			ctx.addIssue({
				code: 'custom',
				path: ['encoding', 'preset'],
				message: `Preset '${val.thumbnailPreset}' was not defined as a preset`,
			});
		}
	})
	.transform((val) => ({
		...val,
		preset: Object.entries(val.preset).reduce(
			(acc, [name, preset]) => ({
				...acc,
				[name]: { ...preset, name, label: preset.label ?? name },
			}),
			{} as { [key: string]: Preset }
		),
	}))
	.transform((val) => ({
		...val,
		coverPreset: val.preset[val.coverPreset],
		thumbnailPreset: val.preset[val.thumbnailPreset],
		preset: (() => {
			const labels = new Map<string, string[]>();

			for (const [key, value] of Object.entries(val.preset)) {
				const existing = labels.get(value.label);

				if (existing) {
					existing.push(key);
				} else {
					labels.set(value.label, [key]);
				}
			}

			for (const [label, presets] of labels
				.entries()
				.filter(([_, presets]) => presets.length > 1)) {
				for (const preset of presets) {
					val.preset[preset].label = `${label} (${preset})`;
				}
			}

			return val.preset;
		})(),
	}))
	.transform((val) => {
		const presets = Object.entries(val.preset).reduce((acc, [name, preset]) => {
			acc.push({ ...preset, name });
			return acc;
		}, [] as Preset[]);

		const readerPresets = presets
			.filter((preset) => val.readerPresets.includes(preset.name))
			.sort((a, b) => {
				const indexA = val.readerPresets.indexOf(a.name);
				const indexB = val.readerPresets.indexOf(b.name);
				return indexA - indexB;
			});

		return {
			...omit(['preset'], val),
			presets,
			readerPresets,
		};
	})
	.superRefine((val, ctx) => {
		if (!val.readerAllowOriginal && !val.readerPresets.length) {
			ctx.addIssue({
				code: 'custom',
				path: ['images'],
				message: `You need to specify images presets for the reader if original images aren't allowed in the reader`,
			});
		}

		const readerDefaultPreset = val.readerDefaultPreset;

		if (
			readerDefaultPreset !== undefined &&
			!val.readerPresets.some((preset) => preset.name.includes(readerDefaultPreset))
		) {
			ctx.addIssue({
				code: 'custom',
				path: ['images'],
				message: `The default reader preset was not found in the reader presets array.`,
			});
		}
	});

const mailerSchema = z.object({
	host: z.string(),
	port: z.number(),
	secure: z.boolean().default(false),
	user: z.string().optional(),
	pass: z.string().optional(),
	from: z.string().default('admin@faccina'),
});

const configSchema = z.object({
	site: siteSchema.default({}),
	server: serverSchema.default({}),
	directories: directoriesSchema,
	database: databaseSchema,
	metadata: metadataSchema.default({}),
	image: imageSchema.default({}),
	mailer: mailerSchema.optional(),
});

const configFile = process.env.CONFIG_FILE ?? 'config.toml';
const content = readFileSync(configFile, 'utf8');

export default configSchema.parse(parseTOML(content));
