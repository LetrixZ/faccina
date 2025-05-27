import chalk from 'chalk';
import { Kysely, Migrator } from 'kysely';
import type { DB } from './types';
import migrations from './migration-list';

export const migrateToLatest = async (db: Kysely<DB>) => {
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

		const { error, results } = await migrator.migrateToLatest();

		results?.forEach((it) => {
			if (it.status === 'Success') {
				console.log(chalk.green(`migration "${it.migrationName}" was executed successfully`));
			} else if (it.status === 'Error') {
				console.error(`failed to execute migration "${it.migrationName}"`);
			}
		});

		if (error) {
			console.error('failed to migrate');
			console.error(error);
			process.exit(1);
		}
	}
};
