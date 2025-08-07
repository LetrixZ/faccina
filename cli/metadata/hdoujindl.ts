import dayjs from 'dayjs';
import arraySupport from 'dayjs/plugin/arraySupport';
import { z } from 'zod';
import config from '../../shared/config';
import { type ArchiveMetadata } from '../../shared/metadata';
import { parseFilename } from './utils';

dayjs.extend(arraySupport);

const metadataSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	author: z.array(z.string()).default([]),
	artist: z.array(z.string()).default([]),
	publisher: z.string().optional(),
	tags: z.record(z.string(), z.array(z.string())).optional(),
	language: z.array(z.string()).optional(),
	url: z.string().optional(),
});

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = JSON.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse HDoujinDownloader metadata: ${error}`);
	}

	archive = structuredClone(archive);

	if (config.metadata?.parseFilenameAsTitle) {
		archive.title = parseFilename(data.title)[0] ?? data.title;
	} else {
		archive.title = data.title;
	}

	archive.description = data.description;

	archive.language = data.language?.[0];

	archive.tags = [];

	const artists = new Set<string>();

	for (const tag of [...data.author, ...data.artist]) {
		artists.add(tag);
	}

	archive.tags.push(...Array.from(artists).map((tag) => ({ namespace: 'artist', name: tag })));

	if (data.publisher) {
		archive.tags.push({ namespace: 'publisher', name: data.publisher });
	}

	if (data.tags) {
		if (data.tags['artist']) {
			archive.tags.push(...data.tags['artist'].map((tag) => ({ namespace: 'artist', name: tag })));
		}

		if (data.tags['group']) {
			archive.tags.push(...data.tags['group'].map((tag) => ({ namespace: 'circle', name: tag })));
		}

		if (data.tags['parody']) {
			archive.tags.push(...data.tags['parody'].map((tag) => ({ namespace: 'parody', name: tag })));
		}

		if (data.tags['male']) {
			archive.tags.push(...data.tags['male'].map((tag) => ({ namespace: 'male', name: tag })));
		}

		if (data.tags['female']) {
			archive.tags.push(...data.tags['female'].map((tag) => ({ namespace: 'female', name: tag })));
		}

		if (data.tags['misc']) {
			archive.tags.push(...data.tags['misc'].map((tag) => ({ namespace: 'tag', name: tag })));
		}

		if (data.tags['other']) {
			archive.tags.push(...data.tags['other'].map((tag) => ({ namespace: 'tag', name: tag })));
		}
	}

	if (data.url) {
		archive.sources = [{ url: data.url }];
	}

	return archive;
};
