import dayjs from 'dayjs';
import { z } from 'zod';
import { ArchiveMetadata } from '../../shared/metadata';

const metadataSchema = z.string().transform((val) =>
	val
		.split(',')
		.map((str) => str.trim())
		.filter((tag) => tag.length)
);

export default async (content: string, archive: ArchiveMetadata) => {
	const { data, error } = metadataSchema.safeParse(content);

	if (!data) {
		throw new Error(`Failed to parse Booru metadata: ${error}`);
	}

	archive = structuredClone(archive);

	if (data.length) {
		archive.tags = data
			.filter((tag) => !/released:\d+/.test(tag))
			.map((tag) => ({ namespace: 'tag', name: tag }));

		const [releasedAt] = data.filter((tag) => /released:\d+/.test(tag));

		if (releasedAt) {
			archive.releasedAt = dayjs.unix(parseInt(releasedAt.split(':')[1])).toDate();
		}
	}

	return archive;
};
