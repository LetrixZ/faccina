import camelcaseKeys from 'camelcase-keys';
import { resolve } from 'node:path';
import { z } from 'zod';
import imageSchema from './config/image.schema';
import metadataSchema from './config/metadata.schema';
import siteSchema from './config/site.schema';
import type { CamelCase } from 'type-fest';

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
	content: z.string().transform((path) => resolve(path)),
	images: z.string().transform((path) => resolve(path)),
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
