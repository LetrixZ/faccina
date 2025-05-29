import { orderSchema, sortSchema, type Order, type Sort } from '$lib/schemas';
import config from '~shared/config';
import chalk from 'chalk';
import dayjs from 'dayjs';
import { appendFile } from 'fs/promises';
import { omit } from 'ramda';
import stripAnsi from 'strip-ansi';
import { z } from 'zod';
import type { GalleryListItem, Tag } from '../types';

export const handleTags = (tags: Tag[]): Tag[] => {
	const { tagExclude, tagWeight } = config.site.galleryListing;

	const filteredTags = tags.filter((tag) => {
		return !tagExclude.some(({ ignoreCase, name, namespace }) => {
			if (name) {
				const normalizedTagName = ignoreCase ? tag.name.toLowerCase() : tag.name;
				const normalizedNames = ignoreCase ? name.map((t) => t.toLowerCase()) : name;

				if (namespace) {
					return namespace === tag.namespace && normalizedNames.includes(normalizedTagName);
				} else {
					return normalizedNames.includes(normalizedTagName);
				}
			} else if (namespace) {
				return namespace === tag.namespace;
			}
		});
	});

	const sortedTags = filteredTags.sort((a, b) => {
		const getWeight = (tag: Tag) => {
			const matchTag = tagWeight.find(({ ignoreCase, name, namespace }) => {
				if (name) {
					const normalizedTagName = ignoreCase ? tag.name.toLowerCase() : tag.name;
					const normalizedNames = ignoreCase ? name.map((t) => t.toLowerCase()) : name;

					if (namespace) {
						return namespace === tag.namespace && normalizedNames.includes(normalizedTagName);
					} else {
						return normalizedNames.includes(normalizedTagName);
					}
				} else if (namespace) {
					return namespace === tag.namespace;
				}
			});

			return matchTag?.weight ?? 0;
		};

		const aWeight = getWeight(a);
		const bWeight = getWeight(b);

		return aWeight === bWeight ? a.name.localeCompare(b.name) : bWeight - aWeight;
	});

	return sortedTags;
};

export const sortArchiveTags = (archive: GalleryListItem): GalleryListItem => {
	archive.tags = handleTags(archive.tags);
	return archive;
};

export const searchSchema = z
	.object({
		q: z.string().default(''),
		page: z.coerce.number().default(1),
		sort: sortSchema.optional(),
		order: orderSchema.optional(),
		limit: z.coerce.number().int().catch(24),
		seed: z.string().optional(),
		series: z
			.string()
			.optional()
			.transform((val) => (val === 'true' || val === '1' ? true : false)),
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

export const parseSearchParams = (
	searchParams: URLSearchParams,
	defaults?: { sort?: Sort; order?: Order }
) =>
	searchSchema
		.transform((val) => {
			if (!config.site.galleryListing.pageLimits.includes(val.limit)) {
				val.limit = config.site.galleryListing.pageLimits[0]!;
			}

			return val;
		})
		.transform((val) => ({
			...val,
			sort: val.sort ?? defaults?.sort ?? config.site.defaultSort,
			order: val.order ?? defaults?.order ?? config.site.defaultOrder,
		}))
		.parse(Object.fromEntries(searchParams));

export const log = (message: string) => {
	if (!config.server.logging) {
		return;
	}

	message = `${message} - ${chalk.cyan(`${dayjs().format('YYYY-MM-DD HH:mm:ss')}`)} ${chalk.gray(`[PID: ${process.pid}]`)}`;
	console.debug(message);

	if (typeof config.server.logging === 'string') {
		try {
			appendFile(config.server.logging, stripAnsi(message) + '\n');
		} catch {
			/* empty */
		}
	}
};

export const readReadableStream = async (stream: NodeJS.ReadableStream, size?: number) => {
	stream.read(size);
	return new Promise<Buffer>((resolve, reject) => {
		stream.once('readable', () => {
			const data = stream.read(size) as Buffer | null;

			if (data) {
				resolve(data);
			}
		});
		stream.on('error', (err) => reject(err));
	});
};

export const readStream = async (stream: NodeJS.ReadableStream) => {
	const chunks: Buffer[] = [];

	for await (const chunk of stream) {
		if (typeof chunk === 'string') {
			continue;
		}

		chunks.push(chunk);
	}

	return Buffer.concat(chunks);
};
