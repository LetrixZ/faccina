import { sha256 } from 'js-sha256';
import { z } from 'zod';

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
	.and(
		z.object({
			width: z.number().optional(),
			label: z.string().max(30).optional(),
		})
	);

export type Preset = z.infer<typeof presetSchema> & {
	name: string;
	label: string;
	hash: string;
};

export const generatePresetHash = (preset: Omit<Preset, 'name' | 'hash' | 'label'>) => {
	const hasher = sha256.create();

	for (const [key, value] of Object.entries(preset)) {
		if (['label'].includes(key)) {
			continue;
		}

		if (value !== undefined) {
			hasher.update(`${key}:${value}`);
		}
	}

	return hasher.hex().substring(0, 8);
};
