import capitalize from 'capitalize';
import dayjs from 'dayjs';
import slugify from 'slugify';
import YAML from 'yaml';
import { z } from 'zod';

import { type Archive, type Source } from '.';
import { mapMultiField, multiTextField } from './schemas';
import { parseSourceName } from './utils';

const metadataSchema = z.object({
	Title: z.string(),
	Description: z.string().optional(),
	Source: z.string().optional(),
	URL: z.string().optional(),
	Artist: multiTextField.optional(),
	Circle: multiTextField.optional(),
	Magazine: multiTextField.optional(),
	Event: multiTextField.optional(),
	Publisher: multiTextField.optional(),
	Parody: multiTextField.optional(),
	Tags: z.array(z.string()).optional(),
	Thumbnail: z.number().optional(),
	Released: z.number().optional(),
});

export default async (content: string, archive: Archive) => {
	archive = structuredClone(archive);

	const parsed = YAML.parse(content);
	const metadata = metadataSchema.safeParse(parsed);

	if (!metadata.success) {
		console.error(metadata.error);

		throw new Error('Failed to parse HentaiNexus metadata');
	}

	archive.title = metadata.data.Title;
	archive.slug = slugify(metadata.data.Title, { lower: true, strict: true });
	archive.description = metadata.data.Description;
	archive.thumbnail =
		metadata.data.Thumbnail !== undefined ? metadata.data.Thumbnail + 1 : undefined;
	archive.released_at = metadata.data.Released
		? dayjs.unix(metadata.data.Released).toDate()
		: undefined;

	archive.artists = mapMultiField(metadata.data.Artist);
	archive.circles = mapMultiField(metadata.data.Circle);
	archive.magazines = mapMultiField(metadata.data.Magazine);
	archive.events = mapMultiField(metadata.data.Event);
	archive.publishers = mapMultiField(metadata.data.Publisher);
	archive.parodies = mapMultiField(metadata.data.Parody);

	if (metadata.data.Tags) {
		archive.tags = metadata.data.Tags.map((tag) => [capitalize.words(tag), '']);
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
