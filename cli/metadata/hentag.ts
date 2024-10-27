import { z } from 'zod';

import config from '../../shared/config';
import { ArchiveMetadata } from '../../shared/metadata';
import { parseFilename } from './utils';

const metadataSchema = z.object({
	title: z.string(),
	parodies: z.array(z.string()).optional(),
	circles: z.array(z.string()).optional(),
	artists: z.array(z.string()).optional(),
	characters: z.array(z.string()).optional(),
	maleTags: z.array(z.string()).optional(),
	femaleTags: z.array(z.string()).optional(),
	otherTags: z.array(z.string()).optional(),
	language: z.string().optional(),
	createdAt: z.number().optional(),
	publishedOn: z.number().optional(),
	locations: z.array(z.string()).optional(),
});

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = JSON.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse HenTag metadata: ${error}`);
	}

	archive = structuredClone(archive);

	if (config.metadata?.parseFilenameAsTitle) {
		archive.title = parseFilename(data.title)[0] ?? data.title;
	} else {
		archive.title = data.title;
	}

	archive.language = data.language;
	archive.releasedAt = (() => {
		if (data.publishedOn) {
			return new Date(data.publishedOn);
		}

		if (data.createdAt) {
			return new Date(data.createdAt);
		}

		return undefined;
	})();

	archive.tags = [];

	if (data.artists) {
		archive.tags.push(...data.artists.map((tag) => ({ namespace: 'artist', name: tag })));
	}

	if (data.circles) {
		archive.tags.push(...data.circles.map((tag) => ({ namespace: 'circle', name: tag })));
	}

	if (data.parodies) {
		archive.tags.push(...data.parodies.map((tag) => ({ namespace: 'parody', name: tag })));
	}

	if (data.maleTags) {
		archive.tags.push(...data.maleTags.map((tag) => ({ namespace: 'male', name: tag })));
	}

	if (data.femaleTags) {
		archive.tags.push(...data.femaleTags.map((tag) => ({ namespace: 'female', name: tag })));
	}

	if (data.characters) {
		archive.tags.push(...data.characters.map((tag) => ({ namespace: 'character', name: tag })));
	}

	if (data.otherTags) {
		archive.tags.push(...data.otherTags.map((tag) => ({ namespace: 'misc', name: tag })));
	}

	if (data.locations) {
		archive.sources = [];

		for (const location of data.locations) {
			archive.sources.push({
				name: location,
				url: location,
			});
		}
	}

	return archive;
};
