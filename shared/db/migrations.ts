import path, { basename } from 'node:path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';
import { Kysely, type Migration, type MigrationProvider, Migrator } from 'kysely';
import { glob } from 'glob';
import type { DB } from '../types';

export class FileMigrationProvider implements MigrationProvider {
	async getMigrations(): Promise<Record<string, Migration>> {
		try {
			const migrations: Record<string, Migration> = import.meta.glob('./migrations/**.ts', {
				eager: true,
			});

			return Object.entries(migrations).reduce(
				(acc, [key, value]) => {
					acc[basename(key).replace('.ts', '')] = value;
					return acc;
				},
				{} as Record<string, Migration>
			);
		} catch {
			const migrations: Record<string, Migration> = {};

			const __filename = fileURLToPath(import.meta.url);
			const __dirname = dirname(__filename);

			const files = glob.globSync('*.ts', {
				cwd: path.join(__dirname, 'migrations'),
				absolute: true,
			});

			for (const filepath of files) {
				const migration = await import(/* @vite-ignore */ filepath);
				migrations[path.parse(filepath).name] = migration;
			}

			return migrations;
		}
	}
}

export default async (db: Kysely<DB>) => {
	const shouldMigrate = await (async () => {
		try {
			const { building } = await import('$app/environment');

			return !building;
		} catch {
			return true;
		}
	})();

	if (shouldMigrate) {
		const migrator = new Migrator({
			db,
			provider: new FileMigrationProvider(),
		});

		const { error, results } = await migrator.migrateToLatest();

		if (error) {
			if (error instanceof Error) {
				throw error;
			} else {
				console.error(error);

				throw new Error('Migration failed');
			}
		} else if (results) {
			for (const result of results) {
				console.info(
					chalk.green(`Applied migration ${chalk.bold(result.migrationName)} successfully`)
				);
			}
		}
	}
};
