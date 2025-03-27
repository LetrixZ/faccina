import { type ArchiveMetadata } from '../../shared/metadata';
import { mapMultiField, multiTextField } from './schemas';
import dayjs from 'dayjs';
import YAML from 'yaml';
import { z } from 'zod';

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

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = YAML.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse HentaiNexus metadata: ${error}`);
	}

	archive = structuredClone(archive);

	archive.title = data.Title;
	archive.description = data.Description;
	archive.thumbnail = data.Thumbnail !== undefined ? data.Thumbnail + 1 : undefined;
	archive.releasedAt = data.Released ? dayjs.unix(data.Released).toDate() : undefined;

	archive.tags = [];

	archive.tags.push(
		...mapMultiField(data.Artist).map((tag) => ({ namespace: 'artist', name: tag }))
	);
	archive.tags.push(
		...mapMultiField(data.Circle).map((tag) => ({ namespace: 'circle', name: tag }))
	);
	archive.tags.push(
		...mapMultiField(data.Magazine).map((tag) => ({ namespace: 'magazine', name: tag }))
	);
	archive.tags.push(...mapMultiField(data.Event).map((tag) => ({ namespace: 'event', name: tag })));
	archive.tags.push(
		...mapMultiField(data.Publisher).map((tag) => ({ namespace: 'publisher', name: tag }))
	);
	archive.tags.push(
		...mapMultiField(data.Parody).map((tag) => ({ namespace: 'parody', name: tag }))
	);

	if (data.Tags) {
		archive.tags.push(...data.Tags.map((tag) => ({ namespace: 'tag', name: tag })));
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
