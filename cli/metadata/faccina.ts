import { type ArchiveMetadata } from '../../shared/metadata';
import dayjs from 'dayjs';
import YAML from 'yaml';
import { z } from 'zod';

export const metadataSchema = z.object({
	id: z.number().optional(),
	hash: z.string().optional(),
	path: z.string().optional(),
	title: z.string(),
	description: z.string().nullish(),
	pages: z.number().optional(),
	thumbnail: z.number().optional(),
	language: z.string().nullish(),
	size: z.number().optional(),
	protected: z.boolean().optional(),
	created_at: z.string().optional(),
	released_at: z.string().nullish(),
	deleted_at: z.string().nullish(),
	tags: z.array(
		z.object({
			namespace: z.string(),
			name: z.string(),
		})
	),
	images: z
		.array(
			z.object({
				filename: z.string(),
				pageNumber: z.number(),
				width: z.number().nullish(),
				height: z.number().nullish(),
			})
		)
		.optional(),
	sources: z
		.array(
			z.object({
				name: z.string(),
				url: z
					.string()
					.nullish()
					.transform((val) => (val === null ? undefined : val)),
			})
		)
		.optional(),
	series: z
		.array(
			z.object({
				title: z.string(),
				order: z.number(),
			})
		)
		.optional(),
});

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = YAML.parse(content);
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse Faccina metadata: ${error}`);
	}

	archive = structuredClone(archive);
	archive.title = data.title;
	archive.description = data.description;
	archive.thumbnail = data.thumbnail;
	archive.language = data.language;
	archive.releasedAt =
		data.released_at != null ? (dayjs(data.released_at).toDate() ?? undefined) : data.released_at;
	archive.tags = data.tags?.map((tag) => ({ namespace: tag.namespace, name: tag.name }));
	archive.imageOrder = data.images
		?.sort((a, b) => {
			const indexA = data.images!.find((image) => image.filename === a.filename)!;
			const indexB = data.images!.find((image) => image.filename === b.filename)!;
			return indexA.pageNumber - indexB.pageNumber;
		})
		.map((image) => ({ filename: image.filename, pageNumber: image.pageNumber }));
	archive.sources = data.sources?.map((source) => ({
		name: source.name,
		url: source.url ?? undefined,
	}));
	archive.series = data.series;

	return archive;
};
