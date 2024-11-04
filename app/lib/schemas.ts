import { omit } from 'ramda';
import { z } from 'zod';

const usernameSchema = z
	.string()
	.trim()
	.min(4, 'Username cannot contain at least 4 characters')
	.max(32, 'Username cannot contain more than 32 characters')
	.regex(/^[a-z0+-9_-]+$/, 'Username must be lowercase and can contain only letters and numbers');
const passwordSchema = z
	.string()
	.min(4, 'Password must contain at least 4 characters')
	.max(255, 'Password cannot contain more than 255 characters');

export const loginSchema = z.object({
	username: usernameSchema,
	password: passwordSchema,
});

export type LoginSchema = typeof loginSchema;

export const registerSchema = z
	.object({
		username: usernameSchema,
		password: passwordSchema,
		confirmPassword: passwordSchema,
		email: z.string().email().optional(),
	})
	.superRefine(({ confirmPassword, password }, ctx) => {
		if (confirmPassword !== password) {
			ctx.addIssue({
				code: 'custom',
				message: "The passwords don't match",
				path: ['confirmPassword'],
			});
		}
	});

export type RegisterSchema = typeof registerSchema;

export const recoverSchema = z.object({
	username: usernameSchema,
});

export type RecoverSchema = typeof recoverSchema;

export const resetSchema = z
	.object({
		code: z.string().length(32, 'Invalid recovery code'),
		password: passwordSchema,
		confirmPassword: passwordSchema,
	})
	.superRefine(({ confirmPassword, password }, ctx) => {
		if (confirmPassword !== password) {
			ctx.addIssue({
				code: 'custom',
				message: "The passwords don't match",
				path: ['confirmPassword'],
			});
		}
	});

export type ResetSchema = typeof resetSchema;

export const editArchiveSchema = z
	.object({
		title: z.string().min(1, 'Title is required'),
		slug: z.string(),
		description: z.string().optional(),
		pages: z.number().min(1),
		thumbnail: z.number().min(1),
		language: z.string().optional(),
		releasedAt: z.string().optional(),
		hasMetadata: z.boolean(),
		sources: z.array(
			z.object({
				name: z.string().min(1, "Source name can't be empty"),
				url: z.string().url('The given URL is not valid').optional().or(z.literal('')),
			})
		),
		protected: z.boolean(),
	})
	.superRefine(({ pages, thumbnail }, ctx) => {
		if (thumbnail > pages) {
			ctx.addIssue({
				code: 'custom',
				message: "The thumbnail can't be bigger than the number of pages",
				path: ['thumbnail'],
			});
		}
	});

export type EditArchiveSchema = typeof editArchiveSchema;

export const editTagsSchema = z.object({
	tags: z.array(z.object({ namespace: z.string(), name: z.string() })),
});

export type EditTagsSchema = typeof editTagsSchema;

export const sortSchema = z.enum([
	'released_at',
	'created_at',
	'title',
	'pages',
	'random',
	'saved_at',
	'collection_order',
]);

export type Sort = z.infer<typeof sortSchema>;

export const orderSchema = z.enum(['asc', 'desc']);

export type Order = z.infer<typeof orderSchema>;

export const searchSchema = z
	.object({
		q: z.string().default(''),
		page: z.coerce.number().default(1),
		sort: sortSchema.optional(),
		order: orderSchema.optional(),
		limit: z.coerce.number().int().catch(24),
		seed: z.string().optional(),
		ids: z
			.string()
			.transform((str) =>
				str
					.split(',')
					.map((id) => parseInt(id))
					.filter((id) => !isNaN(id))
			)
			.optional(),
	})
	.transform((val) => ({
		query: val.q,
		...omit(['q'], val),
	}));

export type SearchParams = z.infer<typeof searchSchema>;

export const createCollectionSchema = z.object({
	name: z
		.string()
		.min(1, `Collection name can't be empty`)
		.max(500, `Collection name should be 500 less than characters`),
	archives: z.array(z.number()).default([]),
});

export type CreateCollection = typeof createCollectionSchema;
