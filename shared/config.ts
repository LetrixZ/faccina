import camelcaseKeys from 'camelcase-keys';
import TOML from 'toml';
import { z } from 'zod';

const camelize = <T extends Record<string, unknown> | ReadonlyArray<Record<string, unknown>>>(
	val: T
) => camelcaseKeys(val);

const siteSchema = z
	.object({
		site_name: z.string().default('Faccina'),
		url: z.string().optional(),
		enable_users: z.boolean().default(true),
		admin_users: z.array(z.string()).default([]),
		default_sort: z.enum(['released_at', 'created_at', 'title', 'pages']).default('released_at'),
		default_order: z.enum(['asc', 'desc']).default('desc'),
	})
	.transform(camelize);

const directoriesSchema = z.object({
	content: z.string(),
	images: z.string(),
});

z.discriminatedUnion('vendor', [
	z.object({
		vendor: z.literal('sqlite'),
		path: z.string(),
		apply_optimizations: z.boolean().default(true),
	}),
	z.object({
		vendor: z.literal('postgresql'),
		host: z.string(),
		port: z.number(),
		database: z.string(),
		username: z.string(),
		password: z.string(),
	}),
]).transform(camelize);

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
			host: z.string(),
			port: z.number(),
		}),
	])
	.transform(camelize);

const metadataSchema = z
	.object({
		parse_filename_as_title: z.boolean().default(true),
	})
	.transform(camelize);

const presetSchema = z
	.discriminatedUnion('format', [
		z.object({
			format: z.literal('webp'),
			quality: z.number().min(1).max(100).optional(),
			lossless: z.boolean().optional(),
			speed: z.number().min(0).max(6).optional(),
		}),
		z.object({
			format: z.literal('jpeg'),
			quality: z.number().min(1).max(100).optional(),
		}),
		z.object({
			format: z.literal('png'),
		}),
		z.object({
			format: z.literal('jxl'),
			quality: z.number().min(1).max(100).optional(),
			speed: z.number().min(3).max(9).optional(),
			lossless: z.boolean().optional(),
		}),
		z.object({
			format: z.literal('avif'),
			quality: z.number().min(1).max(100).optional(),
			speed: z.number().min(1).max(10).optional(),
		}),
	])
	.transform(camelize)
	.and(z.object({ width: z.number() }));

export type Preset = z.infer<typeof presetSchema> & { name: string };

const imageSchema = z
	.object({
		cover_preset: z.string().default('cover'),
		thumbnail_preset: z.string().default('thumbnail'),
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

	return configSchema.parse(TOML.parse(content));
})();

export type DatabaseVendor = z.infer<typeof databaseSchema>['vendor'];
