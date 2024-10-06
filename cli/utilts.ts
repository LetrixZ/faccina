export const parseIdRanges = (str?: string) => {
	if (!str) {
		return;
	}

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
