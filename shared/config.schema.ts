import camelcaseKeys from 'camelcase-keys';
import { omit } from 'ramda';
import type { CamelCase } from 'type-fest';
import { z } from 'zod';
import { generatePresetHash, presetSchema, type Preset } from '../app/lib/image-presets';

type CamelCaseOptions = {
	preserveConsecutiveUppercase?: boolean;
};

type CamelCasedPropertiesDeep<
	Value,
	Options extends CamelCaseOptions = { preserveConsecutiveUppercase: true },
> = Value extends () => void | Date | RegExp
	? Value
	: Value extends Array<infer U>
		? Array<CamelCasedPropertiesDeep<U, Options>>
		: Value extends Set<infer U>
			? Set<CamelCasedPropertiesDeep<U, Options>>
			: {
					[K in keyof Value as CamelCase<K, Options>]: CamelCasedPropertiesDeep<Value[K], Options>;
				};

export const camelizeSchema = <T extends z.ZodTypeAny>(
	zod: T
): z.ZodEffects<z.infer<T>, CamelCasedPropertiesDeep<T['_output']>> =>
	zod.transform((val) => camelcaseKeys(val, { deep: true }) as CamelCasedPropertiesDeep<T>);

export const directoriesSchema = z.object({
	content: z.string(),
	images: z.string(),
});

export const databaseSchema = z.discriminatedUnion('vendor', [
	z.object({
		vendor: z.literal('sqlite'),
		path: z.string(),
	}),
	z.object({
		vendor: z.literal('postgresql'),
		database: z.string(),
		user: z.string(),
		password: z.string(),
		host: z.string().default('localhost'),
		port: z.number().min(0).max(65535).default(5432),
	}),
]);

export const serverSchema = z.object({
	logging: z.union([z.boolean(), z.string()]).default(true),
	auto_unpack: z.boolean().default(false),
});

const stringOrStringArray = z
	.union([z.string(), z.array(z.string())])
	.transform((val) => (typeof val === 'string' ? [val] : val));

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
		tag_weight: z.array(tagWeightSchema).default([
			{ namespace: 'artist', weight: 1000 },
			{ namespace: 'circle', weight: 999 },
			{ namespace: 'parody', weight: 998 },
		]),
		tag_exclude: z
			.array(tagExcludeSchema)
			.default([{ namespace: 'magazine' }, { namespace: 'event' }, { namespace: 'publisher' }]),
		page_limits: z.array(z.number().int()).min(1).catch([24]),
		default_page_limit: z.number().int().optional(),
	})

	.transform((val) => ({
		...val,
		default_page_limit: val.default_page_limit
			? (val.page_limits.find((limit) => limit === val.default_page_limit) ?? val.page_limits[0])!
			: val.page_limits[0]!,
	}));

const siteAdminSchema = z.object({
	delete_require_confirmation: z.boolean().default(true),
});

export const sortTypes = ['released_at', 'created_at', 'title', 'pages', 'random'] as const;
export const orderTypes = ['asc', 'desc'] as const;

const usernameSchema = z
	.string()
	.trim()
	.min(4, 'Username must contain at least 4 characters')
	.max(32, 'Username cannot contain more than 32 characters')
	.regex(/^[a-z0+-9_-]+$/, 'Username must be lowercase and can contain only letters and numbers');

export const siteSchema = z.object({
	site_name: z.string().default('Faccina'),
	url: z
		.string()
		.transform((val) => (val.length ? val : undefined))
		.optional(),
	enable_users: z.boolean().default(true),
	enable_collections: z.boolean().default(true),
	enable_read_history: z.boolean().default(true),
	admin_users: z.array(usernameSchema).default([]),
	default_sort: z.enum(sortTypes).default('released_at'),
	default_order: z.enum(orderTypes).default('desc'),
	guest_downloads: z.boolean().default(true),
	client_side_downloads: z.boolean().default(true),
	gallery_listing: listingSchema.default({}),
	search_placeholder: z.string().default(''),
	store_og_images: z.boolean().default(false),
	secure_session_cookie: z.boolean().default(true),
	admin: siteAdminSchema.default({}),
});

export type SortType = z.infer<typeof siteSchema>['default_sort'];
export type OrderType = z.infer<typeof siteSchema>['default_order'];

export const sortOptions: { value: SortType; label: string }[] = [
	{ value: 'released_at', label: 'Date released' },
	{ value: 'created_at', label: 'Date added' },
	{ value: 'title', label: 'Title' },
	{ value: 'pages', label: 'Pages' },
	{ value: 'random', label: 'Random' },
];

export const orderOptions: { value: OrderType; label: string }[] = [
	{ value: 'desc', label: 'Descending' },
	{ value: 'asc', label: 'Ascending' },
];

const tagMappingSchema = z.object({
	match: stringOrStringArray,
	match_namespace: z.string().optional(),
	namespace: z.string().optional(),
	name: z.string().optional(),
	ignore_case: z.boolean().default(false).optional(),
});

const sourceMappingSchema = z.object({
	match: z.string(),
	name: z.string(),
	ignore_case: z.boolean().default(false).optional(),
});

type SourceMapping = z.infer<typeof sourceMappingSchema>;

const defaultSourceMappings: SourceMapping[] = [
	{ match: 'anchira', name: 'Anchira', ignore_case: true },
	{ match: 'e-hentai', name: 'E-Hentai', ignore_case: true },
	{ match: 'exhentai', name: 'ExHentai', ignore_case: true },
	{ match: 'fakku', name: 'FAKKU', ignore_case: true },
	{ match: 'irodori', name: 'Irodori Comics', ignore_case: true },
	{ match: 'koharu', name: 'Koharu', ignore_case: true },
	{ match: 'hentainexus', name: 'HentaiNexus', ignore_case: true },
	{ match: 'hentai-nexus', name: 'HentaiNexus', ignore_case: true },
	{ match: 'hentag', name: 'HenTag', ignore_case: true },
	{ match: 'patreon', name: 'Patreon', ignore_case: true },
	{ match: 'pixiv', name: 'Pixiv', ignore_case: true },
	{ match: 'projecth', name: 'Project Hentai', ignore_case: true },
	{ match: 'projectxxx', name: 'Project Hentai', ignore_case: true },
	{ match: 'project-xxx', name: 'Project Hentai', ignore_case: true },
	{ match: 'schale', name: 'Koharu', ignore_case: true },
];

const metadataSchema = z.object({
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
});

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
		download_presets: z.array(z.string()).default([]),
		download_default_preset: z.string().optional(),
		download_allow_original: z.boolean().default(true),
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
	.superRefine((val, ctx) => {
		if (val.cover_preset === 'cover' && (!val.preset || !('cover' in val.preset))) {
			val.preset = {
				...val.preset,
				cover: {
					format: 'webp',
					width: 540,
					label: 'Cover',
				},
			};
		} else if (!val.preset || !(val.cover_preset in val.preset)) {
			ctx.addIssue({
				code: 'custom',
				path: ['encoding', 'preset'],
				message: `Preset '${val.cover_preset}' was not defined as a preset`,
			});
		}

		if (val.thumbnail_preset === 'thumbnail' && (!val.preset || !('thumbnail' in val.preset))) {
			val.preset = {
				...val.preset,
				thumbnail: {
					format: 'webp',
					width: 360,
					label: 'Thumbnail',
				},
			};
		} else if (!val.preset || !(val.thumbnail_preset in val.preset)) {
			ctx.addIssue({
				code: 'custom',
				path: ['encoding', 'preset'],
				message: `Preset '${val.thumbnail_preset}' was not defined as a preset`,
			});
		}
	})
	.transform((val) => ({
		...val,
		preset: Object.entries(val.preset).reduce(
			(acc, [name, preset]) => ({
				...acc,
				[name]: { ...preset, name, label: preset.label ?? name, hash: generatePresetHash(preset) },
			}),
			{} as { [key: string]: Preset }
		),
	}))
	.transform((val) => ({
		...val,
		cover_preset: val.preset[val.cover_preset]!,
		thumbnail_preset: val.preset[val.thumbnail_preset]!,
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
					val.preset[preset]!.label = `${label} (${preset})`;
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

		return { ...omit(['preset'], val), presets };
	})
	.transform((val) => {
		const reader_presets = val.presets
			.filter((preset) => val.reader_presets.includes(preset.name))
			.sort((a, b) => {
				const indexA = val.reader_presets.indexOf(a.name);
				const indexB = val.reader_presets.indexOf(b.name);
				return indexA - indexB;
			});

		const download_presets = val.presets
			.filter((preset) => val.download_presets.includes(preset.name))
			.sort((a, b) => {
				const indexA = val.download_presets.indexOf(a.name);
				const indexB = val.download_presets.indexOf(b.name);
				return indexA - indexB;
			});

		return { ...val, reader_presets, download_presets };
	})
	.superRefine((val, ctx) => {
		if (!val.reader_allow_original && !val.reader_presets.length) {
			ctx.addIssue({
				code: 'custom',
				path: ['images'],
				message: `You need to specify images presets for the reader if original images aren't allowed in the reader`,
			});
		}

		if (!val.download_allow_original && !val.download_presets.length) {
			ctx.addIssue({
				code: 'custom',
				path: ['images'],
				message: `You need to specify images presets for the downloads if original images aren't allowed for downloads`,
			});
		}

		const reader_default_preset = val.reader_default_preset;

		if (
			reader_default_preset !== undefined &&
			!val.reader_presets.some((preset) => preset.name.includes(reader_default_preset))
		) {
			ctx.addIssue({
				code: 'custom',
				path: ['images'],
				message: `The default reader preset was not found in the reader presets array.`,
			});
		}

		const download_default_preset = val.download_default_preset;

		if (
			download_default_preset !== undefined &&
			!val.download_presets.some((preset) => preset.name.includes(download_default_preset))
		) {
			ctx.addIssue({
				code: 'custom',
				path: ['images'],
				message: `The default download preset was not found in the download presets array.`,
			});
		}
	})
	.transform((val) => ({
		...val,
		reader_default_preset: val.reader_default_preset
			? val.presets.find((preset) => preset.name === val.reader_default_preset)
			: undefined,
		download_default_preset: val.download_default_preset
			? val.presets.find((preset) => preset.name === val.download_default_preset)
			: undefined,
	}));

export const mailerSchema = z.object({
	host: z.string(),
	port: z.number(),
	secure: z.boolean().default(false),
	user: z.string().optional(),
	pass: z.string().optional(),
	from: z.string(),
});

export const configSchema = z.object({
	directories: directoriesSchema,
	database: databaseSchema,
	server: serverSchema.default({}),
	site: siteSchema.default({}),
	metadata: metadataSchema.default({}),
	image: imageSchema.default({}),
	mailer: mailerSchema.optional(),
});
