import dayjs from 'dayjs';
import slugify from 'slugify';
import YAML from 'yaml';
import { z } from 'zod';

import { type Archive, type Source } from '.';
import { mapMultiField, multiTextField } from './schemas';
import { parseSourceName } from './utils';

const multiIdField = z.union([z.number(), z.string()]);

type MultiIdField = z.infer<typeof multiIdField>;

const parseSourceId = (name: string, id: MultiIdField) => {
	switch (name.toLowerCase()) {
		case 'anchira':
			return `https://anchira.to${id}`;
		case 'hentainexus':
			return `https://hentainexus.com/view/${id}`;
		case 'koharu':
			return `https://koharu.to${id}`;
	}
};

const metadataSchema = z.object({
	Title: z.string(),
	Description: z.string().optional(),
	Artist: multiTextField.optional(),
	Circle: multiTextField.optional(),
	Magazine: multiTextField.optional(),
	Event: multiTextField.optional(),
	Publisher: multiTextField.optional(),
	Parody: multiTextField.optional(),
	Tags: z.array(z.string()).optional(),
	URL: multiTextField.optional(),
	Id: z.record(z.string(), multiIdField).optional(),
	Released: z.number().optional(),
	ThumbnailIndex: z.number().optional(),
	Files: z.array(z.string()).optional(),
});

export default async (content: string, archive: Archive) => {
	archive = structuredClone(archive);

	const parsed = YAML.parse(content);
	const metadata = metadataSchema.safeParse(parsed);

	if (!metadata.success) {
		console.error(metadata.error);

		throw new Error('Failed to parse CCDC06 metadata');
	}

	archive.title = metadata.data.Title;
	archive.slug = slugify(metadata.data.Title, { lower: true, strict: true });
	archive.description = metadata.data.Description;
	archive.thumbnail =
		metadata.data.ThumbnailIndex !== undefined ? metadata.data.ThumbnailIndex + 1 : undefined;
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
		archive.tags = metadata.data.Tags.map((tag) => [tag, '']);
	}

	archive.sources = (() => {
		const sources: Source[] = [];

		mapMultiField(metadata.data.URL)
			?.map((url) => ({
				name: parseSourceName(url),
				url,
			}))
			.forEach((source) => sources.push(source));

		if (metadata.data.Id) {
			Object.entries(metadata.data.Id)
				.map(([name, id]) => ({
					name: parseSourceName(name),
					url: parseSourceId(name, id),
				}))
				.forEach((source) => sources.push(source));
		}

		return sources.length > 0 ? sources : undefined;
	})();

	archive.images = metadata.data.Files?.map((filename, i) => ({
		filename,
		page_number: i + 1,
	}));

	archive.has_metadata = true;

	return archive;
};
