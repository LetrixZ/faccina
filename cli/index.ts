import chalk from 'chalk';
import { Command } from 'commander';

const program = new Command();

program
	.command('index')
	.option(
		'-p --paths <paths...>',
		`indicate which paths to index (defaults to path defined in CONTENT_DIR)`
	)
	.option('--from-path path', `resume indexing from path (not compatible with -p --paths)`)
	.option(
		'-r --recursive',
		'navigate through directories recursively (defaults to true if no path given)'
	)
	.option('-f --force', 'update already indexed archives')
	.option('--reindex', 'only update already indexed archives')
	.option('-v --verbose', 'print more logs')
	.description('index archives to the database')
	.action(
		(options: {
			paths?: string[];
			fromPath?: string;
			recursive?: boolean;
			force?: boolean;
			reindex?: boolean;
			verbose?: boolean;
		}) => {
			import('./archive').then(({ index }) =>
				index({
					...options,
					force: options.reindex === true ? true : options.force,
				})
			);
		}
	);

program
	.command('prune')
	.description('Removes archives from the database if they point to a non existing path')
	.action(() => import('./archive').then(({ prune }) => prune()));

program
	.command('uli')
	.argument('<username>')
	.description('Generate a one time login link for the specified user')
	.action((username) => import('./users').then(({ loginLink }) => loginLink(username)));

program
	.command('recovery')
	.argument('<username>')
	.option('-c --code', 'Return recovery code without sending an email')
	.description('Send access recovery code to the specified user if they have an email')
	.action((username, { code }: { code: boolean }) =>
		import('./users').then(({ accessRecovery }) => accessRecovery(username, code))
	);

program
	.command('migrate:images')
	.description(
		`Migrate resampled images from v1 data directory to v2 new structure (${chalk.bold('Must be run before migrate:db')})`
	)
	.option('--data-dir <dir>', 'Data directory location from v1')
	.option(
		'--format <format>',
		'Indicate which image format to move for the old resampled images [webp, jpeg, png, jxl, avif]'
	)
	.option('--db-url <url>', 'Connection string for the v1 database')
	.action((opts) => import('./migrate').then(({ migrateImages }) => migrateImages(opts)));

program
	.command('migrate:db')
	.description('Migrate archives from v1 PostgreSQL database to v2 SQLite')
	.option('--db-url <url>', 'Connection string for the v1 database')
	.action((opts) => import('./migrate').then(({ migrateDatabase }) => migrateDatabase(opts.dbUrl)));

program.parse();
