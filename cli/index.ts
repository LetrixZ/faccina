import { Command } from 'commander';

import { index, prune } from './archive';
import { loginLink } from './users';

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
			index({
				...options,
				force: options.reindex === true ? true : options.force,
			});
		}
	);

program
	.command('prune')
	.description('Removes archives from the database if they point to a non existing path')
	.action(() => prune());

program
	.command('uli')
	.argument('<username>')
	.description('Generate a one time login link for the specified user')
	.action((username) => loginLink(username));

program.parse();
