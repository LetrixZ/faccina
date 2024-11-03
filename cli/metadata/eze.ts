import dayjs from 'dayjs';
import arraySupport from 'dayjs/plugin/arraySupport';
import { z } from 'zod';
import config from '../../shared/config';
import { ArchiveMetadata } from '../../shared/metadata';
import { parseFilename } from './utils';

dayjs.extend(arraySupport);

const metadataSchema = z.object({
	title: z.string(),
	tags: z.record(z.string(), z.array(z.string())).optional(),
	language: z.string().optional(),
	upload_date: z.array(z.number()).optional(),
	source: z
		.object({
			site: z.string(),
			gid: z.number(),
			token: z.string(),
		})
		.optional(),
});

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = JSON.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse Eze metadata: ${error}`);
	}

	archive = structuredClone(archive);

	if (config.metadata?.parseFilenameAsTitle) {
		archive.title = parseFilename(data.title)[0] ?? data.title;
	} else {
		archive.title = data.title;
	}

	archive.language = data.language;

	if (data.upload_date && data.upload_date.filter((x) => x).length == 6) {
		const [year, month, day, hour, min, sec] = data.upload_date;

		archive.releasedAt = dayjs([year, month + 1, day, hour, min, sec]).toDate();
	}

	if (data.tags) {
		archive.tags = [];

		if (data.tags['artist']) {
			archive.tags.push(...data.tags['artist'].map((tag) => ({ namespace: 'artist', name: tag })));
		}

		if (data.tags['group']) {
			archive.tags.push(...data.tags['group'].map((tag) => ({ namespace: 'circle', name: tag })));
		}

		if (data.tags['parody']) {
			archive.tags.push(...data.tags['parody'].map((tag) => ({ namespace: 'parody', name: tag })));
		}

		if (data.tags['male']) {
			archive.tags.push(...data.tags['male'].map((tag) => ({ namespace: 'male', name: tag })));
		}

		if (data.tags['female']) {
			archive.tags.push(...data.tags['female'].map((tag) => ({ namespace: 'female', name: tag })));
		}

		if (data.tags['misc']) {
			archive.tags.push(...data.tags['misc'].map((tag) => ({ namespace: 'misc', name: tag })));
		}
	}

	if (data.source && (data.source.site === 'e-hentai' || data.source.site === 'exhentai')) {
		const url = `https://${data.source.site}/g/${data.source.gid}/${data.source.token}`;

		archive.sources = [
			{
				name: data.source.site,
				url,
			},
		];
	}

	return archive;
};
