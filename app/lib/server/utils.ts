import { appendFile } from 'fs/promises';
import chalk from 'chalk';
import dayjs from 'dayjs';
import { omit } from 'ramda';
import stripAnsi from 'strip-ansi';
import { z } from 'zod';
import type { GalleryListItem, Tag } from '../types';
import config from '~shared/config';
import { orderSchema, sortSchema, type Order, type Sort } from '$lib/schemas';

export const handleTags = (archive: GalleryListItem): GalleryListItem => {
	const { tagExclude, tagWeight } = config.site.galleryListing;

	const filteredTags = archive.tags.filter((tag) => {
		return !tagExclude.some(({ ignoreCase, name, namespace }) => {
			const normalizedTagName = ignoreCase ? tag.name.toLowerCase() : tag.name;
			const normalizedNames = ignoreCase ? name.map((t) => t.toLowerCase()) : name;

			if (namespace) {
				return namespace === tag.namespace && normalizedNames.includes(normalizedTagName);
			} else {
				return normalizedNames.includes(normalizedTagName);
			}
		});
	});

	const sortedTags = filteredTags.sort((a, b) => {
		const getWeight = (tag: Tag) => {
			const matchTag = tagWeight.find(({ ignoreCase, name, namespace }) => {
				const normalizedTagName = ignoreCase ? tag.name.toLowerCase() : tag.name;
				const normalizedNames = ignoreCase ? name.map((t) => t.toLowerCase()) : name;

				if (namespace) {
					return namespace === tag.namespace && normalizedNames.includes(normalizedTagName);
				} else {
					return normalizedNames.includes(normalizedTagName);
				}
			});

			return matchTag?.weight ?? 0;
		};

		const aWeight = getWeight(a);
		const bWeight = getWeight(b);

		return aWeight === bWeight ? a.name.localeCompare(b.name) : bWeight - aWeight;
	});

	archive.tags = sortedTags;

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
				val.limit = config.site.galleryListing.pageLimits[0];
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

	message = `${message} - ${chalk.cyan(`${dayjs().format('YYYY-MM-DD HH:mm:ss')}`)}`;
	console.debug(message);

	if (typeof config.server.logging === 'string') {
		appendFile(config.server.logging, stripAnsi(message) + '\n');
	}
};
