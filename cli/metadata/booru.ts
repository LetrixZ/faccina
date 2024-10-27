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
		archive.tags = data.map((tag) => ({ namespace: 'tag', name: tag }));
	}

	return archive;
};
