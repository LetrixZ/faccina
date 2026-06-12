import { z } from 'zod/v3';

export const stringOrStringArray = z
	.union([z.string(), z.array(z.string())])
	.transform((val) => (typeof val === 'string' ? [val] : val));
