import type { Tag } from './metadata';

export const leadingZeros = <T extends number | string | bigint>(
	number: T,
	count: number
): string => {
	return number.toString().padStart(count.toString().length, '0');
};

export const generateFilename = (title: string, tags: Tag[]) => {
	const artists = tags.filter((tag) => tag.namespace === 'artist');
	const circles = tags.filter((tag) => tag.namespace === 'circle');
	const magazines = tags.filter((tag) => tag.namespace === 'magazine');

	const splits: string[] = [];

	if (!circles?.length) {
		if (artists?.length === 1) {
			if (artists[0]) {
				splits.push(`[${artists[0].name}]`);
			}
		} else if (artists?.length === 2) {
			if (artists[0] && artists[1]) {
				splits.push(`[${artists[0].name} & ${artists[1].name}]`);
			}
		} else if (artists && artists.length > 2) {
			splits.push(`[Various]`);
		}
	} else if (circles.length === 1) {
		if (artists?.length === 1) {
			if (circles[0] && artists[0]) {
				splits.push(`[${circles[0].name} (${artists[0].name})]`);
			}
		} else if (artists?.length === 2) {
			if (circles[0] && artists[0] && artists[1]) {
				splits.push(`[${circles[0].name} (${artists[0].name} & ${artists[1].name})]`);
			}
		} else {
			if (circles[0]) {
				splits.push(`[${circles[0].name}]`);
			}
		}
	} else {
		splits.push(`[Various]`);
	}

	splits.push(title);

	if (magazines?.length === 1 && magazines[0]) {
		splits.push(`(${magazines[0].name})`);
	}

	return splits
		.join(' ')
		.replace('\u{FF0A}', '*')
		.replace('\u{FF1F}', '?')
		.replace('\u{2044}', '/')
		.replace('\u{A792}', ':');
};

/**
 * @see https://github.com/svenschoenung/glob-escape/blob/master/index.js
 */
export const escapeGlob = (str: string) =>
	str
		.replace(/\\/g, '\\\\')
		.replace(/\*/g, '\\*')
		.replace(/\?/g, '\\?')
		.replace(/\[/g, '\\[')
		.replace(/\]/g, '\\]')
		.replace(/\{/g, '\\{')
		.replace(/\}/g, '\\}')
		.replace(/\)/g, '\\)')
		.replace(/\(/g, '\\(')
		.replace(/!/g, '\\!');
