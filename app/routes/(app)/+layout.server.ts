import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import { loginSchema, recoverSchema, registerSchema, resetSchema } from '~/lib/schemas';
import { taxonomies } from '~/lib/server/db/queries';

export const load = async () => {
	return {
		taxonomies: await taxonomies(),
		loginForm: await superValidate(zod(loginSchema)),
		registerForm: await superValidate(zod(registerSchema)),
		recoverForm: await superValidate(zod(recoverSchema)),
		resetForm: await superValidate(zod(resetSchema)),
	};
};
