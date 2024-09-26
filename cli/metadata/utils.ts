export function parseSourceName(str: string): string {
	str = str.toLowerCase();

	if (str.includes('fakku')) {
		return 'FAKKU';
	} else if (str.includes('irodori')) {
		return 'Irodori Comics';
	} else if (
		str.includes('projecth') ||
		str.includes('project-xxx') ||
		str.includes('projectxxx')
	) {
		return 'Project Hentai';
	} else if (str.includes('pixiv')) {
		return 'Pixiv';
	} else if (str.includes('patreon')) {
		return 'Patreon';
	} else if (str.includes('anchira')) {
		return 'Anchira';
	} else if (str.includes('hentainexus') || str.includes('hentai nexus')) {
		return 'HentaiNexus';
	} else if (str.includes('e-hentai') || str.includes('ehentai')) {
		return 'E-Hentai';
	} else if (str.includes('exhentai') || str.includes('ex-hentai')) {
		return 'ExHentai';
	} else if (str.includes('hentag')) {
		return 'HenTag';
	} else if (str.includes('koharu') || str.includes('schale')) {
		return 'Koharu';
	} else {
		return str;
	}
}

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

	if (captures.length > 1 && !captures[1].startsWith('[') && !captures[1].startsWith('(')) {
		return [
			captures[1],
			captures[0].split(',').map((s) => s.trim().replace(/[[\]()]/g, '')),
			undefined,
		];
	} else {
		return [
			captures.length > 2 ? captures[2] : undefined,
			captures?.[1]?.split(',').map((s) => s.trim().replace(/[[\]()]/g, '')),
			captures[0].split(',').map((s) => s.trim().replace(/[[\]()]/g, '')),
		];
	}
}
