import dayjs from 'dayjs';
import { z } from 'zod';

import config from '../../shared/config';
import { ArchiveMetadata } from '../../shared/metadata';
import { parseFilename } from './utils';

const metadataSchema = z.object({
	title: z.string(),
	language: z.string().optional(),
	date: z.string().optional(),
	tags: z.array(z.string()).optional(),
	category: z.string().optional(),
	gallery_id: z.number().optional(),
	gallery_token: z.string().optional(),
});

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = JSON.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse Gallery-DL metadata: ${error}`);
	}

	archive = structuredClone(archive);

	if (config.metadata?.parseFilenameAsTitle) {
		archive.title = parseFilename(data.title)[0] ?? data.title;
	} else {
		archive.title = data.title;
	}

	archive.language = data.language;
	archive.releasedAt = data.date ? dayjs(data.date, 'YYYY-M-D HH:mm:ss').toDate() : undefined;

	if (data.tags) {
		archive.tags = [];

		for (const tag of data.tags) {
			const [namespace, name] = tag.split(':');

			if (namespace === 'language') {
				continue;
			}

			archive.tags.push({
				namespace: name ? (namespace === 'other' ? 'misc' : namespace) : 'misc',
				name,
			});
		}
	}

	if (data.category && (data.category === 'e-hentai' || data.category === 'exhentai')) {
		const url = `https://${data.category}/g/${data.gallery_id}/${data.gallery_token}`;

		archive.sources = [
			{
				name: data.category,
				url,
			},
		];
	}

	return archive;
};
