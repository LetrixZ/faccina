import chalk from 'chalk';
import { Argument, Command, Option } from 'commander';

const program = new Command();

program
	.command('index')
	.option('-p --paths <paths...>', 'Index given paths.')
	.addOption(new Option('--from-path', 'Index starting from the given path.').conflicts('paths'))
	.addOption(
		new Option('--ids <ID ranges>', 'Re-index given archive IDs.').conflicts(['paths', 'fromPath'])
	)
	.option('-r --recursive', 'Navigate given paths recursively.')
	.option('-f --force', 'Do not check if the archive is alredy indexed.')
	.option('--reindex', 'Check if the archive is already indexed.')
	.option('-v --verbose', 'Print more logs.')
	.description('Index archives to the database.')
	.action(
		(options: {
			paths?: string[];
			ids?: string;
			fromPath?: string;
			recursive?: boolean;
			force?: boolean;
			reindex?: boolean;
			verbose?: boolean;
		}) =>
			import('./archive').then((m) =>
				m.indexArchives({
					...options,
					force: options.reindex === true ? true : options.force,
				})
			)
	);

program
	.command('prune')
	.description('Remove archives that do not exists in the filesystem.')
	.action(() => import('./archive').then((m) => m.pruneArchives()));

program
	.command('generate-images')
	.description('Generate cover and thumbnail images.')
	.option(
		'--ids <ID ranges>',
		'Only generate images for the given ID ranges. Ex: 1,2,3,100-200,600-'
	)
	.option('--reverse', 'Reverse the archive list to generate.')
	.option('-f --force', 'Do not check if the image already exists.')
	.action((options) => import('./images').then((m) => m.generateImages(options)));

program
	.command('uli')
	.argument('<username>')
	.description('Generate a one time login link for the specified user.')
	.action((username) => import('./users').then((m) => m.generateLoginLink(username)));

program
	.command('recovery')
	.argument('<username>')
	.option('-c --code', 'Return recovery code without sending an email.')
	.description('Send access recovery code to the specified user if they have an email.')
	.action((username, { code }: { code: boolean }) =>
		import('./users').then((m) => m.recoverAccess(username, code))
	);

program
	.command('migrate:images')
	.description(
		`Migrate resampled images from v1 data directory to v2 new structure (${chalk.bold('Must be run before migrate:db')}).`
	)
	.requiredOption('--data-dir <dir>', 'Data directory location from v1.')
	.requiredOption(
		'--format <format>',
		'Indicate which image format to move for the old resampled images [webp, jpeg, png, jxl, avif].'
	)
	.requiredOption('--db-url <url>', 'Connection string for the v1 database.')
	.action((opts) => import('./migrate').then((m) => m.migrateImages(opts)));

program
	.command('migrate:db')
	.description('Migrate archives from v1 PostgreSQL database to v2 SQLite.')
	.requiredOption('--db-url <url>', 'Connection string for the v1 database.')
	.action((opts) => import('./migrate').then((m) => m.migrateDatabase(opts.dbUrl)));

program
	.command('metadata:scrape')
	.description('Scrape metadata from specified site.')
	.addArgument(new Argument('<site>', 'Site to scrape metadata from.').choices(['hentag']))
	.addOption(
		new Option('--ids <ID ranges>', 'Re-index given archive IDs.').conflicts(['paths', 'fromPath'])
	)
	.option(
		'--sleep <time>',
		'Indicate how much time in milliseconds to wait between site requests.',
		'5000'
	)
	.action((site, { ids, sleep }) =>
		import('./metadata-cli').then((m) => m.scrape(site, { idRanges: ids, sleep: parseInt(sleep) }))
	);

program.parse();
