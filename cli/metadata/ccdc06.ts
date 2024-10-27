import dayjs from 'dayjs';
import YAML from 'yaml';
import { z } from 'zod';

import { ArchiveMetadata } from '../../shared/metadata';
import { mapMultiField, multiTextField } from './schemas';

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

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = YAML.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse CCDC06 metadata: ${error}`);
	}

	archive = structuredClone(archive);

	archive.title = data.Title;
	archive.description = data.Description;
	archive.thumbnail = data.ThumbnailIndex !== undefined ? data.ThumbnailIndex + 1 : undefined;
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

	for (const url of mapMultiField(data.URL)) {
		archive.sources.push({ url });
	}

	if (data.Id) {
		for (const [name, id] of Object.entries(data.Id)) {
			archive.sources.push({
				name,
				url: parseSourceId(name, id),
			});
		}
	}

	archive.imageOrder = data.Files?.map((filename, i) => ({
		filename,
		pageNumber: i + 1,
	}));

	return archive;
};
