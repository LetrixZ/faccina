import { strFromU8 } from 'fflate';
import { StreamZipAsync } from 'node-stream-zip';
import { extname } from 'path';
import { match } from 'ts-pattern';
import YAML from 'yaml';

import { readStream } from '../../shared/utils';
import anchira from './anchira';
import booru from './booru';
import ccdc06 from './ccdc06';
import eze from './eze';
import ezesad from './ezesad';
import gallerydl from './gallerydl';
import hentag from './hentag';
import hentainexus from './hentainexus';
import koharu from './koharu';
import koromo from './koromo';

export interface Source {
	name: string;
	url?: string;
}

export interface Archive {
	title?: string;
	slug?: string;
	description?: string;
	thumbnail?: number;
	language?: string;
	released_at?: Date;
	artists?: string[];
	circles?: string[];
	magazines?: string[];
	events?: string[];
	publishers?: string[];
	parodies?: string[];
	tags?: [string, string][];
	sources?: Source[];
	images?: { filename: string; page_number: number; width?: number; height?: number }[];
	has_metadata?: boolean;
}

export enum MetadataFormat {
	JSON = 'JSON',
	YAML = 'YAML',
	TXT = 'TXT',
}

export enum MetadataSchema {
	Anchira = 'Anchira',
	HentaiNexus = 'HentaiNexus',
	CCDC06 = 'CCDC06',
	Koharu = 'Koharu',
	HenTag = 'HenTag',
	Eze = 'Eze',
	EzeSad = 'Eze (ExHentai)',
	Koromo = 'Koromo',
	GalleryDL = 'Gallery-DL',
	Booru = 'Booru',
}

export const getYamlSchema = (content: string) => {
	if (content.includes('title:') || content.includes('general:')) {
		return MetadataSchema.Koharu;
	} else if (
		content.includes('DownloadSource:') ||
		content.includes('ThumbnailIndex:') ||
		content.includes('Files:')
	) {
		return MetadataSchema.CCDC06;
	}

	const parsed = YAML.parse(content);

	if (typeof parsed === 'object' && 'Source' in parsed) {
		if (typeof parsed['Source'] === 'string') {
			if (parsed['Source'].includes('hentainexus.com')) {
				return MetadataSchema.HentaiNexus;
			} else if (parsed['Source'].includes('anchira.to')) {
				return MetadataSchema.Anchira;
			}
		}
	}

	if (typeof parsed === 'object' && 'Artist' in parsed) {
		if (Array.isArray(parsed['Artist'])) {
			return MetadataSchema.Anchira;
		} else if (typeof parsed['Artist'] === 'object' || typeof parsed['Artist'] === 'string') {
			return MetadataSchema.HentaiNexus;
		}
	} else if (typeof parsed === 'object' && 'Circle' in parsed) {
		if (Array.isArray(parsed['Circle'])) {
			return MetadataSchema.Anchira;
		} else if (typeof parsed['Circle'] === 'object' || typeof parsed['Circle'] === 'string') {
			return MetadataSchema.HentaiNexus;
		}
	} else if (typeof parsed === 'object' && 'Magazine' in parsed) {
		if (Array.isArray(parsed['Magazine'])) {
			return MetadataSchema.Anchira;
		} else if (typeof parsed['Magazine'] === 'object' || typeof parsed['Magazine'] === 'string') {
			return MetadataSchema.HentaiNexus;
		}
	} else if (typeof parsed === 'object' && 'Event' in parsed) {
		if (Array.isArray(parsed['Event'])) {
			return MetadataSchema.Anchira;
		} else if (typeof parsed['Event'] === 'object' || typeof parsed['Event'] === 'string') {
			return MetadataSchema.HentaiNexus;
		}
	} else if (typeof parsed === 'object' && 'Publisher' in parsed) {
		if (Array.isArray(parsed['Publisher'])) {
			return MetadataSchema.Anchira;
		} else if (typeof parsed['Publisher'] === 'object' || typeof parsed['Publisher'] === 'string') {
			return MetadataSchema.HentaiNexus;
		}
	} else if (typeof parsed === 'object' && 'Parody' in parsed) {
		if (Array.isArray(parsed['Parody'])) {
			return MetadataSchema.Anchira;
		} else if (typeof parsed['Parody'] === 'object' || typeof parsed['Parody'] === 'string') {
			return MetadataSchema.HentaiNexus;
		}
	}

	throw new Error('Failed to determine metadata schema');
};

export const getJsonSchema = (content: string) => {
	const minified = JSON.stringify(JSON.parse(content));

	if (minified.match(/("coverImageUrl"|"maleTags"|"femaleTags")/)) {
		return MetadataSchema.HenTag;
	} else if (minified.match(/"gallery_info":\{/)) {
		return MetadataSchema.EzeSad;
	} else if (minified.match(/("group":|"artist":|"male":|"female":)\[/)) {
		return MetadataSchema.Eze;
	} else if (minified.match(/("artist:.*"|"group:.*"|"male:.*"|"female:.*")/)) {
		return MetadataSchema.GalleryDL;
	} else if (minified.match(/"(("Tags":)\[)|("Artist":")/)) {
		return MetadataSchema.Koromo;
	}

	throw new Error('Failed to determine metadata schema');
};

const handleMetadataFormat = async (
	content: string,
	filename: string,
	format: MetadataFormat,
	archive: Archive
): Promise<[Archive, [MetadataSchema, MetadataFormat]]> => {
	archive = structuredClone(archive);

	switch (format) {
		case MetadataFormat.YAML: {
			const schemaType = getYamlSchema(content);

			switch (schemaType) {
				case MetadataSchema.Anchira:
					archive = await anchira(content, archive);
					break;
				case MetadataSchema.HentaiNexus:
					archive = await hentainexus(content, archive);
					break;
				case MetadataSchema.CCDC06:
					archive = await ccdc06(content, archive);
					break;
				case MetadataSchema.Koharu:
					archive = await koharu(content, archive);
					break;
			}

			return [archive, [schemaType, MetadataFormat.YAML]];
		}

		case MetadataFormat.JSON: {
			const schemaType = getJsonSchema(content);

			switch (schemaType) {
				case MetadataSchema.HenTag:
					archive = await hentag(content, archive);
					break;
				case MetadataSchema.EzeSad:
					archive = await ezesad(content, archive);
					break;
				case MetadataSchema.Eze:
					archive = await eze(content, archive);
					break;
				case MetadataSchema.GalleryDL:
					archive = await gallerydl(content, archive);
					break;
				case MetadataSchema.Koromo:
					archive = await koromo(content, archive);
					break;
			}

			return [archive, [schemaType, MetadataFormat.JSON]];
		}

		case MetadataFormat.TXT: {
			if (filename.endsWith('booru.txt')) {
				archive = await booru(content, archive);

				return [archive, [MetadataSchema.Booru, MetadataFormat.TXT]];
			}
		}
	}

	throw new Error('Failed to determine metadata schema');
};

const metadataFormat = (filename: string) => {
	const extension = extname(filename);

	return match(extension)
		.with('.yaml', '.yml', () => MetadataFormat.YAML)
		.with('.json', () => MetadataFormat.JSON)
		.with('.txt', () => MetadataFormat.TXT)
		.otherwise(() => {
			throw new Error(`Can handle the format for ${filename}`);
		});
};

export const addExternalMetadata = async (path: string, archive: Archive) => {
	archive = structuredClone(archive);

	const files = [
		Bun.file(path.replace(/\.(cbz|zip)/, '.yaml')),
		Bun.file(path.replace(/\.(cbz|zip)/, '.yml')),
		Bun.file(path.replace(/\.(cbz|zip)/, '.json')),
		Bun.file(path.replace(/\.(cbz|zip)/, '.booru.txt')),
	];

	for (const file of files) {
		if (!(await file.exists()) || !file.name) {
			continue;
		}

		const content = await file.text();

		return handleMetadataFormat(content, file.name, metadataFormat(file.name), archive);
	}

	throw new Error('No external metadata file found');
};

export const addEmbeddedMetadata = async (zip: StreamZipAsync, archive: Archive) => {
	archive = structuredClone(archive);

	const entries = [
		await zip.entry('info.yaml'),
		await zip.entry('info.yml'),
		await zip.entry('info.json'),
	];

	for (const entry of entries) {
		if (!entry) {
			continue;
		}

		const stream = await zip.stream(entry);
		const buffer = await readStream(stream);
		const content = strFromU8(buffer);

		return handleMetadataFormat(content, entry.name, metadataFormat(entry.name), archive);
	}

	throw new Error('No embedded metadata file found');
};
