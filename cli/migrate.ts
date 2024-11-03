import { cp, exists, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Glob } from 'bun';
import chalk from 'chalk';
import pg, { Client } from 'pg';
import { z } from 'zod';
import config from '../shared/config';

export const dbUrlSchema = z.string().startsWith('postgres://');

export const migrateImagesSchema = z.object({
	dataDir: z.string(),
	format: z.enum(['webp', 'jpeg', 'png', 'avif', 'jxl']),
	dbUrl: dbUrlSchema,
});

type MigrateImagesOpts = z.infer<typeof migrateImagesSchema>;

export const migrateImages = async (opts: MigrateImagesOpts) => {
	const { dataDir, dbUrl, format } = migrateImagesSchema.parse(opts);

	const dirExists = await exists(dataDir);

	if (!dirExists) {
		throw new Error('Specified data directory does not exists or is not a directory');
	}

	const client = new Client(dbUrl);

	await client.connect();

	const query = {
		text: 'SELECT hash FROM archives',
		rowMode: 'array',
	};

	const result = await client.query(query);

	const count = {
		archives: 0,
		thumbnails: 0,
		covers: 0,
		skip: 0,
	};

	const start = performance.now();

	for (const [hash] of result.rows) {
		const dirname = join(dataDir, 'thumbs', hash);
		const dirExists = await exists(dirname);

		if (!dirExists) {
			count.skip++;

			continue;
		}

		const newDirname = join(config.directories.images, hash);

		await mkdir(join(newDirname, 'cover'), { recursive: true });
		await mkdir(join(newDirname, 'thumbnail'), { recursive: true });

		const glob = new Glob(`*.${format}`);
		const files = Array.from(glob.scanSync({ cwd: dirname, absolute: true }));

		for (const filepath of files.filter((filename) => filename.includes('.c.'))) {
			await cp(filepath, join(newDirname, 'cover', basename(filepath.replace('.c', ''))));
			count.covers++;
		}

		for (const filepath of files.filter((filename) => filename.includes('.t.'))) {
			await cp(filepath, join(newDirname, 'thumbnail', basename(filepath.replace('.t', ''))));
			count.thumbnails++;
		}

		count.archives++;
	}

	const end = performance.now();

	await client.end();

	console.info(chalk.bold(`~~~ Finished in ${((end - start) / 1000).toFixed(2)} seconds ~~~`));
	console.info(
		`Migrated ${chalk.bold(count.covers)} covers and ${chalk.bold(count.thumbnails)} thumbnails from ${chalk.bold(count.archives)} archives\n`
	);
};

export const migrateDatabase = async (dbUrl: string) => {
	dbUrl = dbUrlSchema.parse(dbUrl);

	if (config.database.vendor !== 'sqlite') {
		throw new Error(
			'You can only migrate from v1 PostgreSQL to v2 SQLite. To migrate from v1 to v2 with PostgreSQL, use the same database and make a force index.'
		);
	}

	pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value));

	const client = new Client(dbUrl);

	await client.connect();

	let { rows } = await client.query('SELECT * FROM archives ORDER BY id ASC');

	let count = rows.length;

	if (!count) {
		console.info(`No archives found in the database.`);
		await client.end();

		return;
	}

	console.info(`Found ${chalk.bold(count)} archives in the database.`);

	const lostArchives: unknown[] = [];

	rows = Object.values(
		rows.reduce((acc, obj) => {
			if (!acc[obj.path] || acc[obj.path].id < obj.id) {
				if (acc[obj.path]) {
					if (obj.deleted_at !== null) {
						lostArchives.push(obj);
					} else {
						lostArchives.push(acc[obj.path]);
						acc[obj.path] = obj;
					}
				} else {
					acc[obj.path] = obj;
				}
			}

			return acc;
		}, {})
	);

	if (count !== rows.length) {
		const timestamp = new Date().getTime();
		Bun.write(`lost_${timestamp}.json`, JSON.stringify(lostArchives));

		console.info(
			`Due to duplicated paths, only ${chalk.bold(count)} archives will be migrated.\nA list containing ${chalk.bold(lostArchives.length)} will be saved at ${chalk.bold(`lost_${timestamp}.json`)}.`
		);

		count = rows.length;
	}

	const db = (await import('../shared/db')).default;

	await db
		.insertInto('archives')
		.values(
			rows.map((row) => ({
				...row,
				created_at: new Date(row.created_at).toISOString(),
				updated_at: new Date(row.updated_at).toISOString(),
				released_at: row.released_at ? new Date(row.released_at).toISOString() : null,
				deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
			}))
		)
		.execute();

	await client.end();
	await db.destroy();

	console.info(
		`Migrated ${chalk.bold(count)} archives. Now make a force index to finish the migration.`
	);
};
