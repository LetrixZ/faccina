import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { match } from 'ts-pattern';
import { z } from 'zod';
import { upsertSources, upsertTags } from '../shared/archive';
import db from '../shared/db';
import { jsonArrayFrom, now } from '../shared/db/helpers';
import { generateFilename } from '../shared/utils';
import hentag, { metadataSchema as hentagSchema } from './metadata/hentag';
import { queryIdRanges } from './utilts';

const supportedHenTagSources = [
	'load',
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

export const scrape = async (
	site: string,
	{ idRanges, sleep }: { idRanges?: string; sleep: number }
) => {
	if (isNaN(sleep)) {
		sleep = 5000;
	}

	const parsedSite = z.enum(['hentag']).parse(site);

	match(parsedSite)
		.with('hentag', () => scrapeHenTag({ idRanges, sleep }))
		.exhaustive();
};

const scrapeHenTag = async ({ idRanges, sleep }: { idRanges?: string; sleep: number }) => {
	const query = idRanges
		? queryIdRanges(db.selectFrom('archives'), idRanges)
		: db.selectFrom('archives');

	const archives = await query
		.select((eb) => [
			'id',
			'title',
			'protected',
			jsonArrayFrom(
				eb
					.selectFrom('archiveTags')
					.innerJoin('tags', 'id', 'tagId')
					.select(['id', 'namespace', 'name', 'displayName'])
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
		])
		.orderBy('id', 'asc')
		.execute();

	console.info(`[HenTag] Scraping ${chalk.bold(archives.length)} archives\n`);

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
		progress.update(count, { title: archive.title });

		const sources = archive.sources
			.map((source) => source.url)
			.filter((url) => url && supportedHenTagSources.some((source) => url.includes(source)));

		const res = await (() => {
			if (sources.length) {
				return fetch(`https://hentag.com/api/v1/search/vault/url`, {
					method: 'POST',
					body: JSON.stringify({
						urls: sources,
					}),
				});
			} else {
				const filename = generateFilename(archive.title, archive.tags);

				return fetch(`https://hentag.com/api/v1/search/vault/title`, {
					method: 'POST',
					body: JSON.stringify({
						title: filename,
					}),
				});
			}
		})();

		if (!res.ok) {
			multibar.log(
				`[HenTag] Failed to get metadata for [ID: ${archive.id}] ${chalk.bold(`${archive.title}`)}: ${res.statusText}\n`
			);
			count++;

			continue;
		}

		const { data, error } = z.array(hentagSchema).safeParse(await res.json());

		if (data) {
			const metadata = await hentag(JSON.stringify(data[0]), {});

			multibar.log(
				`[HenTag] Found metadata for [ID: ${archive.id}] ${chalk.bold(`${archive.title}`)} -> ${chalk.bold(metadata.title)}\n`
			);

			if (archive.protected) {
				multibar.log(
					chalk.yellow(
						`[HenTag] Archive [ID: ${archive.id}] ${chalk.bold(`${archive.title}`)} is protected. Updating only basic info.\n`
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
		} else {
			multibar.log(
				`[HenTag] Failed to parsed received metadata for [ID: ${archive.id}] ${chalk.bold(`${archive.title}`)}: ${error}\n`
			);
		}

		progress.increment();
		count++;

		if (archives.length > 1 && i !== archives.length - 1 && sleep) {
			multibar.log(`--- Sleeping for ${sleep}ms ---\n`);
			await Bun.sleep(sleep);
		}
	}

	await db.destroy();
	await Bun.sleep(250);

	multibar.stop();
};
