import { readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ExpressionWrapper, type SelectQueryBuilder, type SqlBool } from 'kysely';
import type { DB } from '../shared/types';

export const parseIdRanges = (str: string) => {
	const idRanges = str.split(',');

	const ids: number[] = [];
	const ranges: [number, number | undefined][] = [];

	for (const idRange of idRanges) {
		const [start, end] = idRange.split('-').map((s) => s.trim());

		if (!start) {
			continue;
		}

		const startId = parseInt(start);

		if (isNaN(startId)) {
			continue;
		}

		if (end !== undefined) {
			if (!end.length) {
				ranges.push([startId, undefined]);
			} else {
				const endId = parseInt(end);

				if (!isNaN(endId)) {
					ranges.push([startId, endId]);
				}
			}
		} else {
			ids.push(startId);
		}
	}

	return { ids, ranges };
};

export const queryIdRanges = <O>(query: SelectQueryBuilder<DB, 'archives', O>, str?: string) => {
	if (!str) {
		return query;
	}

	const { ids, ranges } = parseIdRanges(str);

	if (ids.length || ranges.length) {
		query = query.where(({ eb, and, or }) => {
			const conditions: ExpressionWrapper<DB, 'archives', SqlBool>[] = [];

			if (ids.length) {
				conditions.push(eb('id', 'in', ids));
			}

			for (const [start, end] of ranges) {
				if (end !== undefined) {
					conditions.push(and([eb('id', '>=', start), eb('id', '<=', end)]));
				} else {
					conditions.push(and([eb('id', '>=', start)]));
				}
			}

			return or(conditions);
		});
	}

	return query;
};

/**
 * @see https://stackoverflow.com/a/75986922
 */
export const directorySize = async (path: string) => {
	let size = 0;
	const files = await readdir(path);

	for (const file of files) {
		const filePath = join(path, file);
		const stats = await stat(filePath);

		if (stats.isFile()) {
			size += stats.size;
		} else if (stats.isDirectory()) {
			size += await directorySize(filePath);
		}
	}

	return size;
};

export const readStream = async (stream: NodeJS.ReadableStream) => {
	const chunks: Buffer[] = [];

	for await (const chunk of stream) {
		if (typeof chunk === 'string') {
			continue;
		}

		chunks.push(chunk);
	}

	return Buffer.concat(chunks);
};

export const basenames = (path: string, ...suffix: string[]) => {
	let name = basename(path);

	for (const s of suffix) {
		name = basename(name, s);
	}

	return name;
};
