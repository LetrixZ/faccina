import { z } from 'zod';
import { ArchiveMetadata } from '../../shared/metadata';
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

export default (content: string, archive: ArchiveMetadata) => {
	const parsed = JSON.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse Eze (E-Hentai) metadata: ${error}`);
	}

	archive = structuredClone(archive);

	return eze(JSON.stringify(data?.gallery_info), archive);
};
