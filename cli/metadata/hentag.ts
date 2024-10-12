import capitalize from 'capitalize';
import dayjs from 'dayjs';
import slugify from 'slugify';
import YAML from 'yaml';
import { z } from 'zod';

import config from '../../shared/config';
import { type Archive, type Source } from '../../shared/metadata';
import { parseFilename, parseSourceName } from './utils';

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
	createdAt: z.string().optional(),
	publishedOn: z.string().optional(),
	locations: z.array(z.string()).optional(),
});

export default async (content: string, archive: Archive) => {
	archive = structuredClone(archive);

	const parsed = YAML.parse(content);
	const metadata = metadataSchema.safeParse(parsed);

	if (!metadata.success) {
		console.error(metadata.error);

		throw new Error('Failed to parse HenTag metadata');
	}

	if (config.metadata?.parseFilenameAsTitle) {
		archive.title = parseFilename(metadata.data.title)[0] ?? metadata.data.title;
	} else {
		archive.title = metadata.data.title;
	}

	archive.slug = slugify(archive.title, { lower: true, strict: true });
	archive.language = metadata.data.language;
	archive.released_at = (() => {
		if (metadata.data.publishedOn) {
			return dayjs(metadata.data.publishedOn).toDate();
		}

		if (metadata.data.createdAt) {
			return dayjs(metadata.data.createdAt).toDate();
		}

		return undefined;
	})();

	archive.artists = metadata.data.artists?.map((artist) => capitalize.words(artist));
	archive.circles = metadata.data.circles?.map((circle) => capitalize.words(circle));
	archive.parodies = metadata.data.parodies?.map((parody) => capitalize.words(parody));

	const tags: [string, string][] = [];

	metadata.data.maleTags
		?.map(
			(tag) =>
				[config.metadata.capitalizeTags ? capitalize.words(tag) : tag, 'male'] as [string, string]
		)
		.forEach((tag) => tags.push(tag));
	metadata.data.femaleTags
		?.map(
			(tag) =>
				[config.metadata.capitalizeTags ? capitalize.words(tag) : tag, 'female'] as [string, string]
		)
		.forEach((tag) => tags.push(tag));
	metadata.data.otherTags
		?.map(
			(tag) =>
				[config.metadata.capitalizeTags ? capitalize.words(tag) : tag, 'misc'] as [string, string]
		)
		.forEach((tag) => tags.push(tag));
	metadata.data.characters
		?.map(
			(tag) =>
				[config.metadata.capitalizeTags ? capitalize.words(tag) : tag, 'character'] as [
					string,
					string,
				]
		)
		.forEach((tag) => tags.push(tag));

	if (tags.length > 0) {
		archive.tags = tags;
	}

	if (metadata.data.locations) {
		const sources: Source[] = [];

		for (const location of metadata.data.locations) {
			sources.push({
				name: parseSourceName(location),
				url: location,
			});
		}

		archive.sources = sources.length > 0 ? sources : undefined;
	}

	archive.has_metadata = true;

	return archive;
};
