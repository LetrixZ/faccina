export function parseFilename(
	filename: string
): [title?: string, artists?: string[], circles?: string[]] {
	filename = filename.trim();

	const re = /(\(|\[|\{)?[^([{}\])]+(\}\)|\])?/g;
	const captures: string[] = [];
	for (const cap of filename.matchAll(re)) {
		const str = cap[0].trim();

		if (captures.length === 2 && (str.startsWith('[') || str.startsWith('('))) {
			continue;
		}

		if (str) {
			captures.push(str);
		}
	}

	if (captures.length > 1 && !captures[1]?.startsWith('[') && !captures[1]?.startsWith('(')) {
		return [
			captures[1],
			captures[0]?.split(',').map((s) => s.trim().replace(/[[\]()]/g, '')),
			undefined,
		];
	} else {
		return [
			captures.length > 2 ? captures[2] : undefined,
			captures?.[1]?.split(',').map((s) => s.trim().replace(/[[\]()]/g, '')),
			captures[0]?.split(',').map((s) => s.trim().replace(/[[\]()]/g, '')),
		];
	}
}
