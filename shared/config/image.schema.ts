import { omit } from 'ramda';
import { z } from 'zod';
import { generatePresetHash, presetSchema, type Preset } from '$lib/image-presets';

const cachingSchema = z.object({
	page: z.number().default(365 * 24 * 3600),
	thumbnail: z.number().default(2 * 24 * 3600),
	cover: z.number().default(5 * 24 * 3600),
});

const schema = z
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
		store_resampled_images: z.boolean().default(true),
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

export type ReaderPreset = z.infer<typeof schema>['reader_presets'][number];

export default schema;
