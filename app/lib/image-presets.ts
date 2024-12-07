import { z } from 'zod';
import camelcaseKeys from 'camelcase-keys';

const camelize = <T extends Record<string, unknown> | ReadonlyArray<Record<string, unknown>>>(
	val: T
) => camelcaseKeys(val);

export const presetSchema = z
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
	.and(z.object({ width: z.number(), label: z.string().max(30) }));

export type Preset = z.infer<typeof presetSchema> & { name: string };
