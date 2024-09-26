import dayjs from 'dayjs';
import slugify from 'slugify';
import YAML from 'yaml';
import { z } from 'zod';

import { type Archive, type Source } from '.';
import { stringOrNumberArray } from './schemas';
import { parseSourceName } from './utils';

const metadataSchema = z.object({
	Title: z.string(),
	Description: z.string().optional(),
	Source: z.string().optional(),
	URL: z.string().optional(),
	Artist: stringOrNumberArray.optional(),
	Circle: stringOrNumberArray.optional(),
	Magazine: stringOrNumberArray.optional(),
	Event: stringOrNumberArray.optional(),
	Publisher: stringOrNumberArray.optional(),
	Parody: stringOrNumberArray.optional(),
	Tags: stringOrNumberArray.optional(),
	Thumbnail: z.number().optional(),
	Released: z.number().optional(),
});

export default async (content: string, archive: Archive) => {
	archive = structuredClone(archive);

	const parsed = YAML.parse(content);
	const metadata = metadataSchema.safeParse(parsed);

	if (!metadata.success) {
		console.error(metadata.error);

		throw new Error('Failed to parse Anchira metadata');
	}

	archive.title = metadata.data.Title;
	archive.slug = slugify(metadata.data.Title, { lower: true, strict: true });
	archive.description = metadata.data.Description;
	archive.thumbnail = metadata.data.Thumbnail;
	archive.released_at = metadata.data.Released
		? dayjs.unix(metadata.data.Released).toDate()
		: undefined;

	archive.artists = metadata.data.Artist;
	archive.circles = metadata.data.Circle;
	archive.magazines = metadata.data.Magazine;
	archive.events = metadata.data.Event;
	archive.publishers = metadata.data.Publisher;
	archive.parodies = metadata.data.Parody;

	if (metadata.data.Tags) {
		archive.tags = metadata.data.Tags.map((tag) => [tag, '']);
	}

	archive.sources = (() => {
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

		return sources.length > 0 ? sources : undefined;
	})();

	archive.has_metadata = true;

	return archive;
};
