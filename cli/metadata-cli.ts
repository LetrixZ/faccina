import { dirname, join, parse } from 'node:path';
import cliProgress from 'cli-progress';
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { extract, partial_ratio } from 'fuzzball';
import chalk from 'chalk';
import prompts from 'prompts';
import { match } from 'ts-pattern';
import { z } from 'zod';
import { upsertImages, upsertSeries, upsertSources, upsertTags } from '../shared/archive';
import db from '../shared/db';
import { jsonArrayFrom, like, now } from '../shared/db/helpers';
import { generateFilename } from '../shared/utils';
import { metadataSchema } from './metadata/faccina';
import hentag, { metadataSchema as hentagSchema } from './metadata/hentag';
import { queryIdRanges } from './utilts';
import config from '~shared/config';
import { getArchive } from '$lib/server/db/queries';

const henTagUrl = `https://hentag.com/api/v1/search/vault`;

type HenTagUrlRequest = {
	type: 'url';
	body: { urls: string[] };
};

type HenTagTitleRequest = {
	type: 'title';
	body: { title: string };
};

type HenTagRequest = HenTagUrlRequest | HenTagTitleRequest;

export const scrape = async (
	site: string,
	{
		idRanges,
		paths,
		sleep,
		interaction,
		verbose,
	}: { idRanges?: string; paths: string[]; sleep: number; interaction: boolean; verbose: boolean }
) => {
	if (isNaN(sleep)) {
		sleep = 5000;
	}

	const parsedSite = z.enum(['hentag']).parse(site);

	match(parsedSite)
		.with('hentag', () => scrapeHenTag({ idRanges, paths, sleep, interaction, verbose }))
		.exhaustive();
};

const scrapeHenTag = async ({
	idRanges,
	paths,
	sleep,
	interaction,
	verbose,
}: {
	idRanges?: string;
	paths: string[];
	sleep: number;
	interaction: boolean;
	verbose: boolean;
}) => {
	const supportedSources = [
		'box.load',
		'caitlin',
		'8muses',
		'doujin.io',
		'doujins.com',
		'e-hentai',
		'exhentai',
		'fakku',
		'hanime',
		'hentai2read',
		'hentaifox',
		'hentaigasm',
		'hentaihaven',
		'hentainexus',
		'hitomi',
		'imhentai',
		'irodoricomics',
		'koharu',
		'luscious',
		'mangadex',
		'nhentai',
		'chaika',
		'pururin',
		'tsumino',
	];

	const query = idRanges
		? queryIdRanges(db.selectFrom('archives'), idRanges)
		: db.selectFrom('archives');

	let newQuery = query.select((eb) => [
		'id',
		'title',
		'protected',
		jsonArrayFrom(
			eb
				.selectFrom('archiveTags')
				.innerJoin('tags', 'id', 'tagId')
				.select(['id', 'namespace', 'name'])
				.whereRef('archives.id', '=', 'archiveId')
				.orderBy('archiveTags.createdAt asc')
		).as('tags'),
		jsonArrayFrom(
			eb
				.selectFrom('archiveSources')
				.select(['name', 'url'])
				.whereRef('archives.id', '=', 'archiveId')
				.orderBy('archiveSources.createdAt asc')
		).as('sources'),
	]);

	if (paths.length) {
		newQuery = newQuery.where((eb) => eb.or(paths.map((path) => eb('path', like(), `${path}%`))));
	}

	const archives = await newQuery.orderBy('id', 'asc').execute();

	console.info(`[HenTag] Scraping ${chalk.bold(archives.length)} archives`);

	const multibar = new cliProgress.MultiBar(
		{
			clearOnComplete: true,
			format: ` {bar} - {title} - {value}/{total}`,
			linewrap: true,
		},
		cliProgress.Presets.shades_grey
	);

	const progress = multibar.create(archives.length, 0);
	let count = 0;

	for (const [i, archive] of archives.entries()) {
		const filename = generateFilename(archive.title, archive.tags);

		progress.update(count, { title: archive.title });

		const sources = archive.sources
			.map((source) => source.url?.toString())
			.filter((url) => url !== undefined)
			.filter((url) => supportedSources.some((source) => url.includes(source)));

		const makeRequest = async ({ type, body }: HenTagRequest) => {
			let retries = 0;
			let res = await fetch(`${henTagUrl}/${type}`, { method: 'POST', body: JSON.stringify(body) });

			while (res.status === 429) {
				if (retries >= 3) {
					throw new Error(await res.text());
				}

				if (verbose) {
					multibar.log(
						chalk.gray(
							`[HenTag] Rate limited - Sleeping for ${chalk.bold(`${sleep}ms before retrying`)}\n`
						)
					);
				}

				await Bun.sleep(sleep);

				retries++;
				res = await fetch(`${henTagUrl}/${type}`, { method: 'POST', body: JSON.stringify(body) });
			}

			return res;
		};

		type HenTagMetadata = z.infer<typeof hentagSchema>;

		const results: HenTagMetadata[] = [];

		if (sources.length) {
			try {
				const res = await makeRequest({ type: 'url', body: { urls: sources } });
				const { data, error } = z.array(hentagSchema).safeParse(await res.json());

				if (error) {
					multibar.log(
						chalk.red(
							`[HenTag] Failed to parse metadata obtained from compatible sources for (ID: ${archive.id}) ${chalk.bold(archive.title)}: ${error}\n`
						)
					);
				} else {
					results.push(...data);
				}
			} catch (error) {
				multibar.log(
					chalk.red(
						`[HenTag] Failed to scrape metadata obtained from compatible sources for (ID: ${archive.id}) ${chalk.bold(archive.title)}: ${error}\n`
					)
				);
			}
		}

		if (!results.length) {
			try {
				const res = await makeRequest({ type: 'title', body: { title: filename } });
				const { data, error } = z.array(hentagSchema).safeParse(await res.json());

				if (error) {
					multibar.log(
						chalk.red(
							`[HenTag] Failed to parse metadata obtained from generated title for (ID: ${archive.id}) ${chalk.bold(archive.title)}: ${error}\n`
						)
					);
				} else {
					results.push(...data);
				}
			} catch (error) {
				multibar.log(
					chalk.red(
						`[HenTag] Failed to scrape metadata obtained from compatible sources for (ID: ${archive.id}) ${chalk.bold(archive.title)}: ${error}\n`
					)
				);
			}
		}

		if (!results.length) {
			multibar.log(
				chalk.yellow(
					`[HenTag] No results found for (ID: ${archive.id}) ${chalk.bold(archive.title)}, skipping\n`
				)
			);
			count++;

			continue;
		}

		let result: z.infer<typeof hentagSchema> | undefined = undefined;

		if (results.length === 1) {
			result = results[0];
		} else {
			const bestResult = extract(
				filename,
				results.map((res) => res.title),
				{ scorer: partial_ratio, sortBySimilarity: true }
			)[0]?.[2];

			if (interaction) {
				const { value } = await prompts({
					type: 'select',
					name: 'value',
					message: chalk.reset(`Choose a result for ${chalk.bold(`${archive.title}`)}`),
					initial: bestResult,
					choices: results.map((res) => ({
						title: res.title,
						description: `${[
							...(res.parodies ?? []).map((t) => `parody:${t}`),
							...(res.maleTags ?? []).map((t) => `male:${t}`),
							...(res.femaleTags ?? []).map((t) => `female:${t}`),
							...(res.characters ?? []).map((t) => `character:${t}`),
							...(res.otherTags ?? []).map((t) => `misc:${t}`),
						].join(
							', '
						)}\n [similarity: ${partial_ratio(res.title, filename, {})}] (${res.locations?.filter((s) => !s.includes('hentag.com')).join(', ')})`,
					})),
				});

				result = results[value]!;

				process.stdout.moveCursor(0, -1);
				process.stdout.clearLine(1);
			} else {
				if (bestResult) {
					result = results[bestResult];
				}
			}
		}

		if (!result) {
			multibar.log(
				chalk.yellow(
					`[HenTag] No results found for (ID: ${archive.id}) ${chalk.bold(archive.title)}, skipping\n`
				)
			);
			count++;

			continue;
		}

		const henTagId = result.locations
			?.find((s) => s.includes('hentag.com'))
			?.split('/vault/')
			.at(-1);

		const metadata = await hentag(JSON.stringify(result), {});

		multibar.log(
			chalk.cyan(
				`[HenTag] Found metadata for (ID: ${archive.id}) ${chalk.bold(`${archive.title}`)} -> ${chalk.bold(metadata.title)} (Vault ID: ${henTagId})\n`
			)
		);

		if (archive.protected) {
			multibar.log(
				chalk.yellow(
					`[HenTag] Archive (ID: ${archive.id}) ${chalk.bold(`${archive.title}`)} is protected. Only title, description, release date and language will be updated.\n`
				)
			);
		}

		await db
			.updateTable('archives')
			.set({
				title: metadata.title,
				description: metadata.description,
				releasedAt: metadata.releasedAt?.toISOString(),
				language: metadata.language,
				updatedAt: now(),
			})
			.where('id', '=', archive.id)
			.execute();

		if (!archive.protected) {
			if (metadata.tags) {
				await upsertTags(archive.id, metadata.tags);
			}

			if (metadata.sources) {
				await upsertSources(archive.id, metadata.sources);
			}
		}

		count++;

		if (archives.length > 1 && i !== archives.length - 1 && sleep) {
			multibar.log(chalk.gray(`--- Sleeping for ${sleep}ms ---\n`));
			await Bun.sleep(sleep);
		}
	}

	await db.destroy();
	await Bun.sleep(250);

	multibar.stop();
};

type ExportOptions = {
	excludeImages?: boolean;
};

export const exportMetadata = async (path: string, opts?: ExportOptions) => {
	const archives = await db.selectFrom('archives').select(['id', 'path']).execute();
	const filtered = archives.filter(({ path }) => path.startsWith(config.directories.content));

	const start = performance.now();
	console.info(`Exporting ${chalk.bold(filtered.length)} archives`);

	if (archives.length !== filtered.length) {
		console.warn(
			`Only archives that are inside the content directory will be included in the export`
		);
	}

	const files: Zippable = {};

	for (const { id, path } of archives) {
		if (!path.startsWith(config.directories.content)) {
			continue;
		}

		const archive = (await getArchive(id))!;
		const relativePath = path.replace(config.directories.content, '');
		const filepath = join(dirname(relativePath), `${parse(relativePath).name}.faccina.json`);
		const parsed = metadataSchema.parse({
			...archive,
			protected: !!archive.protected,
			created_at: archive.createdAt,
			released_at: archive.releasedAt,
			deleted_at: archive.deletedAt,
		});

		if (opts?.excludeImages) {
			delete parsed.images;
		}

		files[filepath] = strToU8(JSON.stringify(parsed, null, 2));
	}

	await Bun.write(path, zipSync(files));
	const end = performance.now();

	await db.destroy();

	console.info(
		`Finished exporting ${chalk.bold(filtered.length)} archives in ${((end - start) / 1000).toFixed(2)} seconds`
	);
};

type RestoreOptions = {
	clean: boolean;
	metadataOnly: boolean;
};

export const importMetadata = async (path: string, opts: RestoreOptions) => {
	let interrupt = false;

	if (opts.clean) {
		const exists = await db.selectFrom('archives').select('id').limit(1).executeTakeFirst();

		if (exists) {
			console.info(chalk.bold.red(`THIS WILL REMOVE ALL ARCHIVES FROM THE DATABASE!`));
			interrupt = true;
		}
	}

	if (interrupt) {
		console.info('Press "Enter" to continue');

		for await (const _ of console) {
			break;
		}
	}

	if (opts.clean) {
		console.info(chalk.blue(`Cleaning database`));
		await db.deleteFrom('archives').execute();
	}

	const zip = await Bun.file(path).bytes();
	const metadataFiles = unzipSync(zip, { filter: (file) => file.name.endsWith('.faccina.json') });

	console.info(chalk.blue(`Importing ${chalk.bold(Object.keys(metadataFiles).length)} archives`));

	const start = performance.now();

	for (const file of Object.values(metadataFiles)) {
		const data = metadataSchema.parse(JSON.parse(strFromU8(file)));

		if (
			data.id === undefined ||
			data.hash === undefined ||
			data.path === undefined ||
			data.pages === undefined ||
			data.size === undefined
		) {
			continue;
		}

		let id: number;

		if (opts.metadataOnly) {
			const row = await db
				.insertInto('archives')
				.values({
					title: data.title,
					hash: data.hash,
					path: data.path,
					description: data.description,
					pages: data.pages,
					thumbnail: data.thumbnail,
					language: data.language ?? config.metadata.defaultLanguage,
					size: data.size,
					protected: data.protected,
					createdAt: data.created_at,
					releasedAt: data.released_at,
					deletedAt: data.deleted_at,
				})
				.onConflict((oc) =>
					oc.column('id').doUpdateSet((eb) => ({
						title: eb.ref('excluded.title'),
						description: eb.ref('excluded.description'),
						pages: eb.ref('excluded.pages'),
						thumbnail: eb.ref('excluded.thumbnail'),
						language: eb.ref('excluded.language'),
						protected: eb.ref('excluded.protected'),
						releasedAt: eb.ref('excluded.releasedAt'),
						deletedAt: eb.ref('excluded.deletedAt'),
					}))
				)
				.returning('id')
				.executeTakeFirstOrThrow();

			id = row.id;
		} else {
			await db
				.insertInto('archives')
				.values({
					id: data.id,
					title: data.title,
					hash: data.hash,
					path: data.path,
					description: data.description,
					pages: data.pages,
					thumbnail: data.thumbnail,
					language: data.language ?? config.metadata.defaultLanguage,
					size: data.size,
					protected: data.protected,
					createdAt: data.created_at,
					releasedAt: data.released_at,
					deletedAt: data.deleted_at,
				})
				.onConflict((oc) =>
					oc.column('id').doUpdateSet((eb) => ({
						title: eb.ref('excluded.title'),
						hash: eb.ref('excluded.hash'),
						path: eb.ref('excluded.path'),
						description: eb.ref('excluded.description'),
						pages: eb.ref('excluded.pages'),
						thumbnail: eb.ref('excluded.thumbnail'),
						language: eb.ref('excluded.language'),
						size: eb.ref('excluded.size'),
						protected: eb.ref('excluded.protected'),
						createdAt: eb.ref('excluded.createdAt'),
						releasedAt: eb.ref('excluded.releasedAt'),
						deletedAt: eb.ref('excluded.deletedAt'),
					}))
				)
				.execute();

			id = data.id;
		}

		const updated = await db
			.selectFrom('archives')
			.select(['id', 'hash'])
			.where('id', '=', id)
			.executeTakeFirstOrThrow();

		if (!data.protected) {
			if (data.tags) {
				await upsertTags(updated.id, data.tags);
			}

			if (data.sources) {
				await upsertSources(updated.id, data.sources);
			}

			if (data.series) {
				await upsertSeries(id, data.series);
			}
		}

		if (data.images) {
			await upsertImages(updated.id, data.images, updated.hash);
		}
	}

	const end = performance.now();

	await db.destroy();

	console.info(
		`Finished importing ${chalk.bold(Object.values(metadataFiles).length)} archives in ${((end - start) / 1000).toFixed(2)} seconds`
	);
};
