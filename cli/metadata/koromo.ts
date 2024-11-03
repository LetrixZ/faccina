import dayjs from 'dayjs';
import { z } from 'zod';
import config from '../../shared/config';
import { ArchiveMetadata } from '../../shared/metadata';
import { mapMultiField, multiTextField } from './schemas';
import { parseFilename } from './utils';

const metadataSchema = z.object({
	Title: z.string(),
	Description: z.string().optional(),
	Source: z.string().optional(),
	URL: z.string().optional(),
	Artists: multiTextField.optional(),
	Artist: multiTextField.optional(),
	Circle: multiTextField.optional(),
	Groups: multiTextField.optional(),
	Magazine: multiTextField.optional(),
	Magazines: multiTextField.optional(),
	Publisher: multiTextField.optional(),
	Publishers: multiTextField.optional(),
	Event: multiTextField.optional(),
	Events: multiTextField.optional(),
	Parody: multiTextField.optional(),
	Parodies: multiTextField.optional(),
	Series: multiTextField.optional(),
	Characters: multiTextField.optional(),
	Tags: multiTextField.optional(),
	Thumbnail: z.number().optional(),
	Released: z.number().optional(),
	Published: z.number().optional(),
});

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = JSON.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse Koromo metadata: ${error}`);
	}

	archive = structuredClone(archive);

	if (config.metadata?.parseFilenameAsTitle) {
		archive.title = parseFilename(data.Title)[0] ?? data.Title;
	} else {
		archive.title = data.Title;
	}

	archive.description = data.Description;
	archive.thumbnail = data.Thumbnail !== undefined ? data.Thumbnail + 1 : undefined;
	archive.releasedAt = (() => {
		if (data.Released) {
			return dayjs.unix(data.Released).toDate();
		}

		if (data.Published) {
			return dayjs.unix(data.Published).toDate();
		}

		return undefined;
	})();

	archive.tags = [];

	for (const tag of [...mapMultiField(data.Artist), ...mapMultiField(data.Artists)]) {
		archive.tags.push({ namespace: 'artist', name: tag });
	}

	for (const tag of [...mapMultiField(data.Circle), ...mapMultiField(data.Groups)]) {
		archive.tags.push({ namespace: 'circle', name: tag });
	}

	for (const tag of [...mapMultiField(data.Magazine), ...mapMultiField(data.Magazines)]) {
		archive.tags.push({ namespace: 'magazine', name: tag });
	}

	for (const tag of [...mapMultiField(data.Event), ...mapMultiField(data.Events)]) {
		archive.tags.push({ namespace: 'event', name: tag });
	}

	for (const tag of [...mapMultiField(data.Publisher), ...mapMultiField(data.Publishers)]) {
		archive.tags.push({ namespace: 'publisher', name: tag });
	}

	for (const tag of [
		...mapMultiField(data.Parody),
		...mapMultiField(data.Parodies),
		...mapMultiField(data.Series),
	]) {
		archive.tags.push({ namespace: 'parody', name: tag });
	}

	for (const tag of mapMultiField(data.Tags)) {
		archive.tags.push({ namespace: 'tag', name: tag });
	}

	for (const tag of mapMultiField(data.Characters)) {
		archive.tags.push({ namespace: 'character', name: tag });
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
