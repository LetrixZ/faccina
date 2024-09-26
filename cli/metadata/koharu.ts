import capitalize from 'capitalize';
import slugify from 'slugify';
import YAML from 'yaml';
import { z } from 'zod';

import { type Archive, type Source } from '.';
import config from '../../shared/config';
import { stringOrNumberArray } from './schemas';
import { parseFilename, parseSourceName } from './utils';

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

export default async (content: string, archive: Archive) => {
	archive = structuredClone(archive);

	const parsed = YAML.parse(content);
	const metadata = metadataSchema.safeParse(parsed);

	if (!metadata.success) {
		console.error(metadata.error);

		throw new Error('Failed to parse Koharu metadata');
	}

	if (config.metadata?.parseFilename) {
		archive.title = parseFilename(metadata.data.title)[0] ?? metadata.data.title;
	} else {
		archive.title = metadata.data.title;
	}

	archive.slug = slugify(archive.title, { lower: true, strict: true });
	archive.description = metadata.data.description;

	archive.artists = metadata.data.artist?.map((artist) => capitalize.words(artist));
	archive.circles = metadata.data.circle?.map((circle) => capitalize.words(circle));
	archive.magazines = metadata.data.magazine?.map((magazine) => capitalize.words(magazine));
	archive.events = metadata.data.event?.map((event) => capitalize.words(event));
	archive.parodies = metadata.data.parody?.map((parody) => capitalize.words(parody));

	archive.language = metadata.data.language?.map((language) => capitalize.words(language))[0];

	const tags: [string, string][] = [];

	metadata.data.general
		?.map((tag) => [capitalize.words(tag), ''] as [string, string])
		.forEach((tag) => tags.push(tag));
	metadata.data.female
		?.map((tag) => [capitalize.words(tag), 'female'] as [string, string])
		.forEach((tag) => tags.push(tag));
	metadata.data.male
		?.map((tag) => [capitalize.words(tag), 'male'] as [string, string])
		.forEach((tag) => tags.push(tag));
	metadata.data.character
		?.map((tag) => [capitalize.words(tag), 'character'] as [string, string])
		.forEach((tag) => tags.push(tag));
	metadata.data.mixed
		?.map((tag) => [capitalize.words(tag), 'mixed'] as [string, string])
		.forEach((tag) => tags.push(tag));
	metadata.data.other
		?.map((tag) => [capitalize.words(tag), 'other'] as [string, string])
		.forEach((tag) => tags.push(tag));

	if (tags.length > 0) {
		archive.tags = tags;
	}

	const sources: Source[] = [];

	if (metadata.data.url) {
		sources.push({
			name: parseSourceName(metadata.data.url),
			url: metadata.data.url,
		});
	}

	if (metadata.data.source) {
		sources.push({
			name: parseSourceName(metadata.data.source),
			url: `https://koharu.to${metadata.data.source.split(':').pop()}`,
		});
	}

	if (sources.length > 0) {
		archive.sources = sources;
	}

	archive.has_metadata = true;

	return archive;
};
