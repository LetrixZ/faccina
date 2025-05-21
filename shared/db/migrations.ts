import chalk from 'chalk';
import { Kysely, Migrator } from 'kysely';
import type { DB } from './types';
import migrations from './migration-list';

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
			provider: {
				getMigrations: async () => migrations,
			},
		});

		for (const migration of await migrator.getMigrations()) {
			const { error, results } = await migrator.migrateUp();

			if (error) {
				console.error(chalk.red(`Migration ${chalk.bold(migration.name)} failed`));
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
	}
};
