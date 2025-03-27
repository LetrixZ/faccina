import { stringOrStringArray } from './common';
import { z } from 'zod';

const tagMappingSchema = z.object({
	match: stringOrStringArray,
	match_namespace: z.string().optional(),
	namespace: z.string().optional(),
	name: z.string().optional(),
	ignore_case: z.boolean().default(false).optional(),
});

const sourceMappingSchema = z.object({
	match: z.string(),
	name: z.string(),
	ignore_case: z.boolean().default(false).optional(),
});

type SourceMapping = z.infer<typeof sourceMappingSchema>;

const defaultSourceMappings: SourceMapping[] = [
	{ match: 'anchira', name: 'Anchira', ignore_case: true },
	{ match: 'e-hentai', name: 'E-Hentai', ignore_case: true },
	{ match: 'exhentai', name: 'ExHentai', ignore_case: true },
	{ match: 'fakku', name: 'FAKKU', ignore_case: true },
	{ match: 'irodori', name: 'Irodori Comics', ignore_case: true },
	{ match: 'koharu', name: 'Koharu', ignore_case: true },
	{ match: 'hentainexus', name: 'HentaiNexus', ignore_case: true },
	{ match: 'hentai-nexus', name: 'HentaiNexus', ignore_case: true },
	{ match: 'hentag', name: 'HenTag', ignore_case: true },
	{ match: 'patreon', name: 'Patreon', ignore_case: true },
	{ match: 'pixiv', name: 'Pixiv', ignore_case: true },
	{ match: 'projecth', name: 'Project Hentai', ignore_case: true },
	{ match: 'projectxxx', name: 'Project Hentai', ignore_case: true },
	{ match: 'project-xxx', name: 'Project Hentai', ignore_case: true },
	{ match: 'schale', name: 'Koharu', ignore_case: true },
];

const schema = z.object({
	parse_filename_as_title: z.boolean().default(true),
	default_language: z.string().optional(),
	tag_mapping: z.array(tagMappingSchema).default([]),
	source_mapping: z
		.array(sourceMappingSchema)
		.default([])
		.transform((val) =>
			val.concat(defaultSourceMappings).reduce((sources, source) => {
				const existingSource = sources.find((s) => s.match === source.match);

				if (existingSource) {
					return sources;
				}
				return [...sources, source];
			}, [] as SourceMapping[])
		),
});

export default schema;
