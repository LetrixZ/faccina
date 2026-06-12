import { getUserBlacklist, tagList } from '$lib/server/db/queries.js';
import { decompressBlacklist } from '$lib/utils.js';
import type { Actions, PageServerLoad } from './$types';
import { gzipSync, strToU8 } from 'fflate';
import { z } from 'zod';
import { now } from '~shared/db/helpers.js';
import db from '~shared/db/index.js';

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const tags = await tagList();

	if (locals.user) {
		return {
			tags,
			blacklist: await getUserBlacklist(locals.user.id)
		};
	} else {
		return {
			tags,
			blacklist: decompressBlacklist(cookies.get('blacklist'))
		};
	}
};

export const actions: Actions = {
	saveBlacklist: async ({ request, cookies, locals }) => {
		const data = await request.formData();
		const blacklist = JSON.parse(data.get('blacklist')?.toString() ?? '[]');
		const parsed = z.array(z.string()).parse(blacklist);

		if (locals.user) {
			await db
				.insertInto('userBlacklist')
				.values({
					userId: locals.user.id,
					blacklist: JSON.stringify(parsed)
				})
				.onConflict((oc) =>
					oc.column('userId').doUpdateSet((eb) => ({
						blacklist: eb.ref('excluded.blacklist'),
						updatedAt: now()
					}))
				)
				.execute();
		} else {
			cookies.set(
				'blacklist',
				Buffer.from(gzipSync(strToU8(JSON.stringify(parsed)))).toString('base64'),
				{
					path: '/',
					maxAge: 31556952
				}
			);
		}
	}
};
