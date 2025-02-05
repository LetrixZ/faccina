import { readdirSync } from 'node:fs';
import { basename, dirname, extname, join, parse } from 'node:path';
import { Glob } from 'bun';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { strFromU8 } from 'fflate';
import { StreamZipAsync } from 'node-stream-zip';
import { match } from 'ts-pattern';
import XML2JS from 'xml2js';
import YAML from 'yaml';
import type { ArchiveMetadata } from '../../shared/metadata';
import type { IndexScan, MetadataScan } from '../archive';
import { basenames } from '../utilts';
import anchira from './anchira';
import booru from './booru';
import ccdc06 from './ccdc06';
import comicinfo from './comicinfo';
import eze from './eze';
import ezesad from './ezesad';
import faccina from './faccina';
import gallerydl from './gallerydl';
import hentag from './hentag';
import hentainexus from './hentainexus';
import koharu from './koharu';
import koromo from './koromo';

export enum MetadataFormat {
	JSON = 'JSON',
	YAML = 'YAML',
	TXT = 'TXT',
	XML = 'XML',
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
	ComicInfo = 'ComicInfo',
	Faccina = 'Faccina',
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

	throw new Error('Failed to determine YAML metadata schema');
};

export const getJsonSchema = (content: string) => {
	const minified = JSON.stringify(JSON.parse(content));

	if (minified.match(/("coverImageUrl"|"maleTags"|"femaleTags")/)) {
		return MetadataSchema.HenTag;
	} else if (minified.match(/(("Tags":)\[)|("Artist":")/)) {
		return MetadataSchema.Koromo;
	} else if (minified.match(/"gallery_info":\{/)) {
		return MetadataSchema.EzeSad;
	} else if (
		minified.match(/"tags":{.*?(artist|group|parody|character|language|female|male|misc)(.*?)},/)
	) {
		return MetadataSchema.Eze;
	} else if (minified.match(/"tags":\[.*?(artist|group|parody|character|language):(.*?)\],/)) {
		return MetadataSchema.GalleryDL;
	} else if (minified.match(/"tags":\[.*?"namespace".*?\]/)) {
		return MetadataSchema.Faccina;
	}

	throw new Error('Failed to determine JSON metadata schema');
};

export const getXmlSchema = (content: string) => {
	const parsed = XML2JS.parseStringSync(content);

	if ('ComicInfo' in parsed) {
		return MetadataSchema.ComicInfo;
	}

	throw new Error('Failed to determine XML metadata schema');
};

const handleMetadataFormat = async (
	content: string,
	filename: string,
	format: MetadataFormat,
	archive: ArchiveMetadata
): Promise<[ArchiveMetadata, [MetadataSchema, MetadataFormat]]> => {
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
			if (filename.endsWith('faccina.json')) {
				archive = await faccina(content, archive);
				return [archive, [MetadataSchema.Faccina, MetadataFormat.JSON]];
			}

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
				case MetadataSchema.Faccina:
					archive = await faccina(content, archive);
					break;
			}

			return [archive, [schemaType, MetadataFormat.JSON]];
		}

		case MetadataFormat.TXT: {
			if (filename.endsWith('booru.txt')) {
				archive = await booru(content, archive);
				return [archive, [MetadataSchema.Booru, MetadataFormat.TXT]];
			}

			break;
		}

		case MetadataFormat.XML: {
			const schemaType = getXmlSchema(content);

			switch (schemaType) {
				case MetadataSchema.ComicInfo:
					archive = await comicinfo(content, archive);
					break;
			}

			return [archive, [schemaType, MetadataFormat.XML]];
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
		.with('.xml', () => MetadataFormat.XML)
		.otherwise(() => {
			throw new Error(`Can't handle the format for ${filename}`);
		});
};

type Logger = cliProgress.MultiBar | null;

const metadataFilenames = ['info.json', 'info.yaml', 'info.yml', 'ComicInfo.xml'];
const metadataExtensions = ['.json', '.yaml', '.yml', '.xml', '.booru.txt', '.faccina.json'];

export const addExternalMetadata = async (
	scan: IndexScan,
	archive: ArchiveMetadata,
	pb: Logger
) => {
	archive = structuredClone(archive);

	const normalized =
		scan.type === 'archive' ? basenames(scan.path, '.cbz', '.zip') : parse(scan.path).name;

	const paths = readdirSync(dirname(scan.path))
		.filter((path) => {
			return (
				basenames(path, ...metadataExtensions) === normalized &&
				/^.*(json|yml|yaml|xml|booru.txt|faccina.json)$/.test(path)
			);
		})
		.map((path) => join(dirname(scan.path), path))
		.sort((a, b) => (a.endsWith('faccina.json') ? -1 : b.endsWith('faccina.json') ? 1 : 0));

	for (const path of paths) {
		try {
			const content = await Bun.file(path).text();
			return await handleMetadataFormat(
				content,
				basename(path),
				metadataFormat(basename(path)),
				archive
			);
		} catch (error) {
			if (pb) {
				pb.log(chalk.yellow(`Failed to add external metadata ${chalk.bold(path)}: ${error}\n`));
			}
		}
	}

	throw new Error('No external metadata file found');
};

export const addEmbeddedZipMetadata = async (
	zip: StreamZipAsync,
	archive: ArchiveMetadata,
	pb: Logger
) => {
	archive = structuredClone(archive);

	for (const path of metadataFilenames) {
		try {
			const entry = await zip.entry(path);

			if (!entry) {
				continue;
			}

			const buffer = await zip.entryData(entry);
			const content = strFromU8(buffer);

			return await handleMetadataFormat(content, entry.name, metadataFormat(entry.name), archive);
		} catch (error) {
			if (pb) {
				pb.log(`Failed to add embedded ZIP metadata ${chalk.bold(path)}: ${error}\n`);
			}
		}
	}

	throw new Error('No embedded ZIP metadata file found');
};

export const addEmbeddedDirMetadata = async (
	scan: MetadataScan,
	archive: ArchiveMetadata,
	pb: Logger
) => {
	archive = structuredClone(archive);

	if (scan.metadata) {
		const content = await Bun.file(scan.metadata).text();
		return handleMetadataFormat(
			content,
			basename(scan.metadata),
			metadataFormat(basename(scan.metadata)),
			archive
		);
	} else {
		const metadataGlob = new Glob('*/{info.{json,yml,yaml},ComicInfo.xml,booru.txt}');
		const paths = Array.from(
			metadataGlob.scanSync({ cwd: scan.path, absolute: true, followSymlinks: true })
		);

		for (const path of paths) {
			try {
				const content = await Bun.file(path).text();
				return await handleMetadataFormat(
					content,
					basename(path),
					metadataFormat(basename(path)),
					archive
				);
			} catch (error) {
				if (pb) {
					pb.log(`Failed to add embedded directory metadata ${chalk.bold(path)}: ${error}\n`);
				}
			}
		}
	}

	throw new Error('No embedded directory metadata file found');
};
