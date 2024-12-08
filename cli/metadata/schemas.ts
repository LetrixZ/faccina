import { z } from 'zod';

export const stringOrNumberArray = z
	.array(z.union([z.string(), z.number()]))
	.brand('StringOrNumberArray')
	.transform((items) => items.map((item) => (typeof item === 'number' ? item.toString() : item)))
	.default([]);

export const multiTextField = z
	.union([z.string(), stringOrNumberArray, z.record(z.union([z.number(), z.string()]), z.string())])
	.brand('MultiTexField');

export type MultiTextField = z.infer<typeof multiTextField>;

export const mapMultiField = (field: MultiTextField | null | undefined) => {
	if (!field) {
		return [];
	}

	if (Array.isArray(field)) {
		return field;
	} else if (typeof field === 'object') {
		return Object.values(field);
	} else {
		return field.split(',').map((f) => f.trim());
	}
};
