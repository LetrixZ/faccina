import capitalize from 'capitalize';
import dayjs from 'dayjs';
import slugify from 'slugify';
import YAML from 'yaml';
import { z } from 'zod';

import type { Archive, Source } from '../../shared/metadata';

import config from '../../shared/config';
import { mapMultiField, multiTextField } from './schemas';
import { parseFilename, parseSourceName } from './utils';

const metadataSchema = z.object({
	Title: z.string(),
	Description: z.string().optional(),
	Source: z.string().optional(),
	URL: z.string().optional(),
	Artists: multiTextField.optional(),
	Artist: multiTextField.optional(),
	Circle: multiTextField.optional(),
	Groups: multiTextField.optional(),
	Magazine: multiTextField.optional(),
	Publisher: multiTextField.optional(),
	Events: multiTextField.optional(),
	Parody: multiTextField.optional(),
	Series: multiTextField.optional(),
	Characters: multiTextField.optional(),
	Tags: multiTextField.optional(),
	Thumbnail: z.number().optional(),
	Released: z.number().optional(),
	Published: z.number().optional(),
});

export default async (content: string, archive: Archive) => {
	archive = structuredClone(archive);

	const parsed = YAML.parse(content);
	const metadata = metadataSchema.safeParse(parsed);

	if (!metadata.success) {
		console.error(metadata.error);

		throw new Error('Failed to parse Koromo metadata');
	}

	if (config.metadata?.parseFilenameAsTitle) {
		archive.title = parseFilename(metadata.data.Title)[0] ?? metadata.data.Title;
	} else {
		archive.title = metadata.data.Title;
	}

	archive.slug = slugify(archive.title, { lower: true, strict: true });
	archive.description = metadata.data.Description;
	archive.thumbnail =
		metadata.data.Thumbnail !== undefined ? metadata.data.Thumbnail + 1 : undefined;
	archive.released_at = (() => {
		if (metadata.data.Released) {
			return dayjs.unix(metadata.data.Released).toDate();
		}

		if (metadata.data.Published) {
			return dayjs.unix(metadata.data.Published).toDate();
		}

		return undefined;
	})();

	const artists: string[] = [];

	mapMultiField(metadata.data.Artist)?.forEach((artist) => artists.push(artist));
	mapMultiField(metadata.data.Artists)?.forEach((artist) => artists.push(artist));

	if (artists.length > 0) {
		archive.artists = artists;
	}

	const circles: string[] = [];

	mapMultiField(metadata.data.Circle)?.forEach((circle) => circles.push(circle));
	mapMultiField(metadata.data.Groups)?.forEach((circle) => circles.push(circle));

	if (circles.length > 0) {
		archive.circles = circles;
	}

	archive.magazines = mapMultiField(metadata.data.Magazine);
	archive.events = mapMultiField(metadata.data.Events);
	archive.publishers = mapMultiField(metadata.data.Publisher);

	const parodies: string[] = [];

	mapMultiField(metadata.data.Parody)?.forEach((parody) => parodies.push(parody));
	mapMultiField(metadata.data.Series)?.forEach((parody) => parodies.push(parody));

	if (parodies.length > 0) {
		archive.parodies = parodies;
	}

	const tags: [string, string][] = [];

	mapMultiField(metadata.data.Tags)
		?.map((tag) => [capitalize.words(tag), ''] as [string, string])
		.forEach((tag) => tags.push(tag));
	mapMultiField(metadata.data.Characters)
		?.map((tag) => [capitalize.words(tag), 'character'] as [string, string])
		.forEach((tag) => tags.push(tag));

	if (tags.length > 0) {
		archive.tags = tags;
	}

	const sources: Source[] = [];

	if (metadata.data.URL) {
		sources.push({
			name: parseSourceName(metadata.data.URL),
			url: metadata.data.URL,
		});
	}

	if (metadata.data.Source) {
		sources.push({
			name: parseSourceName(metadata.data.Source),
			url: metadata.data.Source,
		});
	}

	if (sources.length > 0) {
		archive.sources = sources;
	}

	archive.has_metadata = true;

	return archive;
};
