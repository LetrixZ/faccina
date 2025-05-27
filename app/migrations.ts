import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import config from '~shared/config';
import { exists, createGlobMatcher, imageDirectory } from '~shared/server.utils';

const migrateImagesSubHashDirectory = async () => {
	const folders = await readdir(config.directories.images);

	const filtered: string[] = [];

	for (const folder of folders) {
		if (folder.length > 2 && (await stat(join(config.directories.images, folder))).isDirectory()) {
			filtered.push(folder);
		}
	}

	if (!filtered.length) {
		return;
	}

	console.info(
		chalk.blue(`Found ${filtered.length} archive image folders to migrate to new folder structure`)
	);

	const multibar = new cliProgress.MultiBar(
		{
			clearOnComplete: true,
			format: ` {bar} - {path} - {value}/{total}`,
			linewrap: true,
		},
		cliProgress.Presets.shades_grey
	);

	const progress = multibar.create(filtered.length, 0);
	let count = 0;

	const start = performance.now();

	for (const name of filtered) {
		progress.update(count, { path: name });

		const hash = name;
		const oldPath = join(config.directories.images, hash);
		const newPath = imageDirectory(hash);

		if (!(await exists(newPath))) {
			await mkdir(newPath, { recursive: true });
		}

		try {
			await rename(oldPath, newPath);
		} catch {
			const res = await createGlobMatcher('**/*').scan(oldPath);

			for (const file of res) {
				await mkdir(dirname(join(newPath, file)), { recursive: true }).catch(() => {});
				await rename(join(oldPath, file), join(newPath, file));
			}

			await rm(oldPath, { recursive: true });
		}

		count++;
	}

	const end = performance.now();
	multibar.stop();

	console.info(chalk.bold(`~~~ Finished in ${((end - start) / 1000).toFixed(2)} seconds ~~~`));
	console.info(`Migrated ${chalk.bold(count)} archive images\n`);
};

export const runMigrations = async () => {
	await migrateImagesSubHashDirectory();
};
