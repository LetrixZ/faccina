import capitalize from 'capitalize';
import { z } from 'zod';

import type { Archive } from '../../shared/metadata';

const metadataSchema = z.string().transform((val) =>
	val
		.split(',')
		.map((str) => str.trim())
		.filter((tag) => tag.length)
);

export default async (content: string, archive: Archive) => {
	archive = structuredClone(archive);

	const metadata = metadataSchema.safeParse(content);

	if (!metadata.success) {
		console.error(metadata.error);

		throw new Error('Failed to parse Booru metadata');
	}

	if (metadata.data.length) {
		archive.tags = metadata.data.map((value) => [capitalize.words(value), '']);
	}

	return archive;
};
