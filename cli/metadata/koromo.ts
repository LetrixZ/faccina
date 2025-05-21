import dayjs from 'dayjs';
import { z } from 'zod';
import config from '../../shared/config';
import { type ArchiveMetadata } from '../../shared/metadata';
import { mapMultiField, multiTextField } from './schemas';
import { parseFilename } from './utils';

const metadataSchema = z.object({
	Title: z.string(),
	Description: z.string().nullable().optional(),
	Source: z.string().nullable().optional(),
	URL: multiTextField.nullable().optional(),
	Artists: multiTextField.nullable().optional(),
	Artist: multiTextField.nullable().optional(),
	Circle: multiTextField.nullable().optional(),
	Groups: multiTextField.nullable().optional(),
	Magazine: multiTextField.nullable().optional(),
	Magazines: multiTextField.nullable().optional(),
	Publisher: multiTextField.nullable().optional(),
	Publishers: multiTextField.nullable().optional(),
	Event: multiTextField.nullable().optional(),
	Events: multiTextField.nullable().optional(),
	Parody: multiTextField.nullable().optional(),
	Parodies: multiTextField.nullable().optional(),
	Series: multiTextField.nullable().optional(),
	Characters: multiTextField.nullable().optional(),
	Tags: multiTextField.nullable().optional(),
	Thumbnail: z.number().nullable().optional(),
	Released: z.number().nullable().optional(),
	Published: z.number().nullable().optional(),
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

	archive.description = data.Description ?? undefined;
	archive.thumbnail =
		data.Thumbnail !== null && data.Thumbnail !== undefined ? data.Thumbnail + 1 : undefined;
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
		const [namespace, name] = tag.split(':');
		if (namespace && name) {
			archive.tags.push({ namespace, name });
		} else {
			archive.tags.push({ namespace: 'tag', name: tag });
		}
	}

	for (const tag of mapMultiField(data.Characters)) {
		archive.tags.push({ namespace: 'character', name: tag });
	}

	archive.sources = [];

	if (data.URL?.length) {
		for (const url of mapMultiField(data.URL)) {
			archive.sources.push({ url });
		}
	}

	if (data.Source) {
		archive.sources.push({ url: data.Source });
	}

	return archive;
};
