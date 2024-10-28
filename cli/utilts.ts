import { ExpressionWrapper, SelectQueryBuilder, SqlBool } from 'kysely';
import { DB } from '../shared/types';

export const parseIdRanges = (str: string) => {
	const idRanges = str.split(',');

	const ids: number[] = [];
	const ranges: [number, number | undefined][] = [];

	for (const idRange of idRanges) {
		const [start, end] = idRange.split('-').map((s) => s.trim());

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
