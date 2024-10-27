import chalk from 'chalk';
import { gzipSync, strToU8 } from 'fflate';
import { z } from 'zod';

import { tagList } from '~/lib/server/db/queries';
import { decompressBlacklist } from '~/lib/utils';

export const load = async ({ cookies }) => {
	const blacklist = (() => {
		const compressed = cookies.get('blacklist')?.toString();

		if (!compressed) {
			return [];
		}

		try {
			return decompressBlacklist(compressed);
		} catch (err) {
			console.error(
				chalk.red(
					`[${new Date().toISOString()}] ${chalk.blue``} ${chalk.blue`preferences`} - Failed to get blacklist from cookie\n`
				),
				err
			);

			return [];
		}
	})();

	return { tags: await tagList(), blacklist };
};

export const actions = {
	saveBlacklist: async ({ request, cookies }) => {
		const data = await request.formData();
		const blacklist = JSON.parse(data.get('blacklist')?.toString() ?? '[]');

		const parsed = z.array(z.string()).parse(blacklist);

		cookies.set(
			'blacklist',
			Buffer.from(gzipSync(strToU8(JSON.stringify(parsed)))).toString('base64'),
			{
				path: '/',
				maxAge: 31556952,
			}
		);
	},
};
