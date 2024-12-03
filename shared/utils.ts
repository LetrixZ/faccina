import type { PathLike } from 'node:fs';
import { access } from 'node:fs/promises';
import type { Tag } from './metadata';

export const isBun = !!process.versions.bun;

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

export const leadingZeros = <T extends number | string | bigint>(
	number: T,
	count: number
): string => {
	return number.toString().padStart(count.toString().length, '0');
};

export const generateFilename = (title: string, tags?: Tag[]) => {
	const artists = tags?.filter((tag) => tag.namespace === 'artist');
	const circles = tags?.filter((tag) => tag.namespace === 'circle');
	const magazines = tags?.filter((tag) => tag.namespace === 'magazine');

	const splits: string[] = [];

	if (!circles?.length) {
		if (artists?.length === 1) {
			splits.push(`[${artists[0].name}]`);
		} else if (artists?.length === 2) {
			splits.push(`[${artists[0].name} & ${artists[1].name}]`);
		} else if (artists && artists.length > 2) {
			splits.push(`[Various]`);
		}
	} else if (circles.length === 1) {
		if (artists?.length === 1) {
			splits.push(`[${circles[0].name} (${artists[0].name})]`);
		} else if (artists?.length === 2) {
			splits.push(`[${circles[0].name} (${artists[0].name} & ${artists[1].name})]`);
		} else {
			splits.push(`[${circles[0].name}]`);
		}
	} else {
		splits.push(`[Various]`);
	}

	splits.push(title);

	if (magazines?.length === 1) {
		splits.push(`(${magazines[0].name})`);
	}

	return splits
		.join(' ')
		.replace('\u{FF0A}', '*')
		.replace('\u{FF1F}', '?')
		.replace('\u{2044}', '/')
		.replace('\u{A792}', ':');
};

export const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

export const exists = async (path: PathLike) => {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
};
