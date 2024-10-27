import dayjs from 'dayjs';
import YAML from 'yaml';
import { z } from 'zod';

import { ArchiveMetadata } from '../../shared/metadata';
import { stringOrNumberArray } from './schemas';

const metadataSchema = z.object({
	Title: z.string(),
	Description: z.string().optional(),
	Source: z.string().optional(),
	URL: z.string().optional(),
	Artist: stringOrNumberArray,
	Circle: stringOrNumberArray,
	Magazine: stringOrNumberArray,
	Event: stringOrNumberArray,
	Publisher: stringOrNumberArray,
	Parody: stringOrNumberArray,
	Tags: stringOrNumberArray,
	Thumbnail: z.number().optional(),
	Released: z.number().optional(),
});

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = YAML.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse Anchira metadata: ${error}`);
	}

	archive = structuredClone(archive);

	archive.title = data.Title;
	archive.title = data.Title;
	archive.description = data.Description;
	archive.thumbnail = data.Thumbnail;
	archive.releasedAt = data.Released ? dayjs.unix(data.Released).toDate() : undefined;

	archive.tags = [];

	for (const tag of data.Artist) {
		archive.tags.push({ namespace: 'artist', name: tag });
	}

	for (const tag of data.Circle) {
		archive.tags.push({ namespace: 'circle', name: tag });
	}

	for (const tag of data.Magazine) {
		archive.tags.push({ namespace: 'magazine', name: tag });
	}

	for (const tag of data.Event) {
		archive.tags.push({ namespace: 'event', name: tag });
	}

	for (const tag of data.Publisher) {
		archive.tags.push({ namespace: 'publisher', name: tag });
	}

	for (const tag of data.Parody) {
		archive.tags.push({ namespace: 'parody', name: tag });
	}

	for (const tag of data.Tags) {
		archive.tags.push({ namespace: 'tag', name: tag });
	}

	archive.sources = [];

	if (data.URL) {
		archive.sources.push({ url: data.URL });
	}

	if (data.Source) {
		archive.sources.push({ url: data.Source });
	}

	return archive;
};
