import { Glob } from 'bun';
import chalk from 'chalk';
import { Kysely, type Migration, type MigrationProvider, Migrator } from 'kysely';
import { readdir } from 'node:fs/promises';
import { join, parse } from 'node:path';

import type { DB } from '../types';

class ESMFileMigrationProvider implements MigrationProvider {
	async getMigrations(): Promise<Record<string, Migration>> {
		if (typeof import.meta.glob === 'function') {
			// Dev
			const migrations: Record<string, Migration> = import.meta.glob('../../migrations/**.ts', {
				eager: true,
			});

			return Object.entries(migrations).reduce(
				(migrations, [key, migration]) => ({ ...migrations, [parse(key).name]: migration }),
				{}
			);
		} else {
			const migrations: Record<string, Migration> = {};

			try {
				// Build
				const glob = new Glob('*.ts');
				const files = await Array.fromAsync(
					glob.scan({ cwd: join(__dirname, '../../../migrations'), absolute: true })
				);

				for (const filepath of files) {
					const migration = await import(/* @vite-ignore */ filepath);
					migrations[parse(filepath).name] = migration;
				}

				return migrations;
			} catch {
				// Kysely
				const migrations: Record<string, Migration> = {};
				const files = await readdir(join(import.meta.dirname, '../../migrations'));

				for (const fileName of files) {
					if (fileName.endsWith('.ts')) {
						const migration = await import(
							/* @vite-ignore */
							join(import.meta.dirname, '../../migrations', fileName)
						);
						const migrationKey = fileName.substring(0, fileName.lastIndexOf('.'));

						const isMigration = (obj: unknown): obj is Migration => {
							return (
								typeof obj === 'object' &&
								obj !== null &&
								'up' in obj &&
								typeof obj.up === 'function'
							);
						};

						// Handle esModuleInterop export's `default` prop...
						if (isMigration(migration?.default)) {
							migrations[migrationKey] = migration.default;
						} else if (isMigration(migration)) {
							migrations[migrationKey] = migration;
						}
					}
				}

				return migrations;
			}
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
			provider: new ESMFileMigrationProvider(),
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
