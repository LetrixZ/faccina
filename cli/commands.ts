import chalk from 'chalk';
import { Argument, Command, Option } from 'commander';
import * as archive from './archive';
import * as images from './images';
import * as users from './users';
import * as migrate from './migrate';
import * as metadataCli from './metadata-cli';

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
	.option('--unpack', 'Unpack archives in the images directory.')
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
			unpack?: boolean;
			verbose?: boolean;
		}) =>
			archive.indexArchives({
				...options,
				force: options.reindex === true ? true : options.force,
			})
	);

program
	.command('prune')
	.description('Remove archives that do not exists in the filesystem.')
	.action(() => archive.pruneArchives());

program
	.command('generate-images')
	.description('Generate cover and thumbnail images.')
	.option(
		'--ids <ID ranges>',
		'Only generate images for the given ID ranges. Ex: 1,2,3,100-200,600-'
	)
	.option('--reverse', 'Reverse the archive list to generate.')
	.option('-f --force', 'Do not check if the image already exists.')
	.action((options) => images.generateImages(options));

program
	.command('uli')
	.argument('<username>')
	.description('Generate a one time login link for the specified user.')
	.action((username) => users.generateLoginLink(username));

program
	.command('recovery')
	.argument('<username>')
	.option('-c --code', 'Return recovery code without sending an email.')
	.description('Send access recovery code to the specified user if they have an email.')
	.action((username, { code }: { code: boolean }) => users.recoverAccess(username, code));

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
	.action((opts) => migrate.migrateImages(opts));

program
	.command('migrate:db')
	.description('Migrate archives from v1 PostgreSQL database to v2 SQLite.')
	.requiredOption('--db-url <url>', 'Connection string for the v1 database.')
	.action((opts) => migrate.migrateDatabase(opts.dbUrl));

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
	.option(
		'-y --no-interaction',
		'Skip any prompts. If there are multiple results, the most similar one will be chosen.'
	)
	.option('-v --verbose', 'Print more logs.')
	.action((site, { ids, sleep, interaction, verbose }) =>
		metadataCli.scrape(site, { idRanges: ids, sleep: parseInt(sleep), interaction, verbose })
	);

export default program;
