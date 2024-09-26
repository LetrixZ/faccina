import YAML from 'yaml';
import { z } from 'zod';

import { type Archive } from '.';
import eze from './eze';

const metadataSchema = z.object({
	gallery_info: z.object({
		title: z.string(),
		tags: z.record(z.string(), z.array(z.string())).optional(),
		language: z.string().optional(),
		upload_date: z.array(z.number()).optional(),
		source: z.object({
			site: z.string(),
			gid: z.number(),
			token: z.string(),
		}),
	}),
});

export default (content: string, archive: Archive) => {
	const parsed = YAML.parse(content);
	const metadata = metadataSchema.safeParse(parsed);

	if (!metadata.success) {
		console.error(metadata.error);

		throw new Error('Failed to parse Eze (ExHentai) metadata');
	}

	return eze(YAML.stringify(metadata.data?.gallery_info), archive);
};
