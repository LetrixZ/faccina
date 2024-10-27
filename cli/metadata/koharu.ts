import capitalize from 'capitalize';
import YAML from 'yaml';
import { z } from 'zod';

import config from '../../shared/config';
import { ArchiveMetadata } from '../../shared/metadata';
import { stringOrNumberArray } from './schemas';
import { parseFilename } from './utils';

const metadataSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	source: z.string().optional(),
	artist: stringOrNumberArray.optional(),
	circle: stringOrNumberArray.optional(),
	parody: stringOrNumberArray.optional(),
	magazine: stringOrNumberArray.optional(),
	event: stringOrNumberArray.optional(),
	general: stringOrNumberArray.optional(),
	female: stringOrNumberArray.optional(),
	male: stringOrNumberArray.optional(),
	character: stringOrNumberArray.optional(),
	mixed: stringOrNumberArray.optional(),
	other: stringOrNumberArray.optional(),
	language: stringOrNumberArray.optional(),
	url: z.string().optional(),
});

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = YAML.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse Koharu metadata: ${error}`);
	}

	archive = structuredClone(archive);

	if (config.metadata?.parseFilenameAsTitle) {
		archive.title = parseFilename(data.title)[0] ?? data.title;
	} else {
		archive.title = data.title;
	}

	archive.description = data.description;
	archive.language = data.language?.map((language) => capitalize.words(language))[0];

	archive.tags = [];

	if (data.artist) {
		archive.tags.push(...data.artist.map((tag) => ({ namespace: 'artist', name: tag })));
	}

	if (data.circle) {
		archive.tags.push(...data.circle.map((tag) => ({ namespace: 'circle', name: tag })));
	}

	if (data.magazine) {
		archive.tags.push(...data.magazine.map((tag) => ({ namespace: 'magazine', name: tag })));
	}

	if (data.event) {
		archive.tags.push(...data.event.map((tag) => ({ namespace: 'event', name: tag })));
	}

	if (data.parody) {
		archive.tags.push(...data.parody.map((tag) => ({ namespace: 'parody', name: tag })));
	}

	if (data.general) {
		archive.tags.push(...data.general.map((tag) => ({ namespace: 'general', name: tag })));
	}

	if (data.male) {
		archive.tags.push(...data.male.map((tag) => ({ namespace: 'male', name: tag })));
	}

	if (data.female) {
		archive.tags.push(...data.female.map((tag) => ({ namespace: 'female', name: tag })));
	}

	if (data.character) {
		archive.tags.push(...data.character.map((tag) => ({ namespace: 'character', name: tag })));
	}

	if (data.mixed) {
		archive.tags.push(...data.mixed.map((tag) => ({ namespace: 'mixed', name: tag })));
	}

	if (data.other) {
		archive.tags.push(...data.other.map((tag) => ({ namespace: 'other', name: tag })));
	}

	archive.sources = [];

	if (data.url) {
		archive.sources.push({ url: data.url });
	}

	if (data.source) {
		archive.sources.push({ url: `https://koharu.to${data.source.split(':').pop()}` });
	}

	return archive;
};
