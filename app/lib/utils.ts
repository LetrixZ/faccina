import { error } from '@sveltejs/kit';
import chalk from 'chalk';
import { type ClassValue, clsx } from 'clsx';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { gunzipSync, strFromU8 } from 'fflate';
import * as R from 'ramda';
import _slugify from 'slugify';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';
import { ImageSize, TouchLayout } from './models';
import type { Gallery, Image, Tag } from './types';

_slugify.extend({ '.': '-', _: '-', '+': '-' });

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

export const cn = (...inputs: ClassValue[]) => {
	return twMerge(clsx(inputs));
};

/** https://stackoverflow.com/a/20732091 */
export const humanFileSize = (size: number) => {
	const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));

	return +(size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

export const dateTimeFormat = (date: string) => {
	return dayjs(date).format('L, HH:mm');
};

export const dateFormat = (date: string) => {
	return dayjs(date).format('L');
};

export const encodeURL = (url: string) => {
	return encodeURI(url).replace(/#/g, '%23').replaceAll(/\+/g, '%2B');
};

export const generateFilename = (archive: Gallery) => {
	const artists = archive.tags.filter((tag) => tag.namespace === 'artist');
	const circles = archive.tags.filter((tag) => tag.namespace === 'circle');
	const magazines = archive.tags.filter((tag) => tag.namespace === 'magazine');

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

	splits.push(archive.title);

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

export const isSpread = (image: Image) => {
	if (image.width && image.height) {
		return image.width > image.height;
	}

	return false;
};

// https://stackoverflow.com/a/1349426
export const randomString = () => {
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;

	while (counter < 6) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}

	return result;
};

export const getMetadata = (gallery: Gallery) => {
	const artists = gallery.tags.filter((tag) => tag.namespace === 'artist').map((tag) => tag.name);
	const circles = gallery.tags.filter((tag) => tag.namespace === 'circle').map((tag) => tag.name);
	const magazines = gallery.tags
		.filter((tag) => tag.namespace === 'magazine')
		.map((tag) => tag.name);
	const events = gallery.tags.filter((tag) => tag.namespace === 'event').map((tag) => tag.name);
	const parodies = gallery.tags.filter((tag) => tag.namespace === 'parody').map((tag) => tag.name);
	const publishers = gallery.tags
		.filter((tag) => tag.namespace === 'publisher')
		.map((tag) => tag.name);
	const tags = gallery.tags
		.filter(isTag)
		.map((tag) => (tag.namespace !== 'tag' ? `${tag.namespace}:${tag.name}` : tag.name));

	return {
		Title: gallery.title,
		Description: gallery.description ?? undefined,
		Artist: artists.length ? artists : undefined,
		Groups: circles.length ? circles : undefined,
		Magazine: magazines.length ? magazines : undefined,
		Event: events.length ? events : undefined,
		Parody: parodies.length ? parodies : undefined,
		Publisher: publishers.length ? publishers : undefined,
		Pages: gallery.pages,
		Tags: tags,
		Source: `https://${location.hostname}/g/${gallery.id}`,
		Released: gallery.releasedAt && new Date(gallery.releasedAt).getTime() / 1000,
		Thumbnail: gallery.thumbnail - 1,
	};
};

export const preferencesSchema = z.object({
	imageSize: z.nativeEnum(ImageSize).catch(ImageSize.Original),
	touchLayout: z.nativeEnum(TouchLayout).catch(TouchLayout.LeftToRight),
	minWidth: z.number().optional(),
	maxWidth: z.number().optional().default(1280),
	barPlacement: z.enum(['top', 'bottom']).catch('bottom'),
});

export interface ReaderPreferences {
	imageSize: ImageSize;
	touchLayout: TouchLayout;
	minWidth: number | undefined;
	maxWidth: number | undefined;
	barPlacement: 'top' | 'bottom';
}

export type BarPlacement = ReaderPreferences['barPlacement'];

export const isScrolledIntoView = (el: HTMLElement, currentTop: number) => {
	const rect = el.getBoundingClientRect();

	return rect.top >= 0 && rect.bottom <= currentTop;
};

export const remToPx = (rem: number) => {
	return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
};

// https://stackoverflow.com/a/10134261
export const randomInt = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const handleFetchError = async <T>(res: Response) => {
	if (!res.ok) {
		const { message } = await res.json();
		error(res.status, { status: res.status, message });
	} else {
		return res.json() as T;
	}
};

export const processTags = (tags: Tag[]) => {
	const tagNamespaces = tags.map((tag) => `${tag.namespace}:${tag.name}`);

	const frequencyMap = tagNamespaces.reduce(
		(acc, item) => {
			const afterColon = item.split(':').slice(1).join(':');
			acc[afterColon] = (acc[afterColon] || 0) + 1;
			return acc;
		},
		{} as { [key: string]: number }
	);

	const result = tagNamespaces.map((item) => {
		const afterColon = item.split(':').slice(1).join(':');

		if (frequencyMap[afterColon] === 1) {
			return afterColon;
		} else {
			return item;
		}
	});

	return tags.map((tag, i) => ({ ...tag, name: result[i] }));
};

export const shuffle = <T>(array: T[], seed: string) => {
	let currentIndex = array.length;
	let temporaryValue: T;
	let randomIndex: number;

	let seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

	const random = function () {
		const x = Math.sin(seedNum++) * 10000;

		return x - Math.floor(x);
	};

	while (0 !== currentIndex) {
		randomIndex = Math.floor(random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
};

export const cleanNested = <T>(obj: T) => {
	const clonned = structuredClone(obj);

	for (const key in clonned) {
		const value = clonned[key];
		if (
			clonned[key] === null ||
			clonned[key] === undefined ||
			clonned[key] === '' ||
			(Array.isArray(value) && !value.length)
		) {
			delete clonned[key];
		} else if (typeof clonned[key] === 'object') {
			cleanNested(clonned[key]);
		}
	}

	return clonned;
};

export const slugify = (str: string) => {
	return _slugify(str, { lower: true, strict: true });
};

export const truncate = (str: string, max: number) => {
	return str.substring(0, max - 1) + (str.length > max ? '&hellip;' : '');
};

export const isTag = (tag: Pick<Tag, 'namespace'>) =>
	!['artist', 'circle', 'magazine', 'event', 'publisher', 'parody'].includes(tag.namespace);

export const debounce = (callback: () => void, wait = 300) => {
	let timeout: ReturnType<typeof setTimeout>;

	return () => {
		clearTimeout(timeout);
		timeout = setTimeout(() => callback(), wait);
	};
};

export const decompressBlacklist = (compressed?: string) => {
	if (!compressed) {
		return [];
	}

	try {
		const data = JSON.parse(
			strFromU8(gunzipSync(new Uint8Array(Buffer.from(compressed, 'base64'))))
		);
		return z.array(z.string()).parse(data);
	} catch (err) {
		console.error(
			chalk.red(
				`[${new Date().toISOString()}] ${chalk.blue``} ${chalk.blue`preferences`} - Failed to get blacklist from cookie\n`
			),
			err
		);

		return [];
	}
};

export const swap = R.curry((index1, index2, list) => {
	if (index1 < 0 || index2 < 0 || index1 > list.length - 1 || index2 > list.length - 1) {
		return list;
	}

	const value1 = list[index1];
	const value2 = list[index2];

	return R.pipe(R.set(R.lensIndex(index1), value2), R.set(R.lensIndex(index2), value1))(list);
});

export const relativeDate = (date: string) => {
	const normalized = dayjs(dayjs(date).format('L'));

	if (normalized.isToday()) {
		return 'Today';
	} else if (normalized.isYesterday()) {
		return 'Yesterday';
	} else if (dayjs().diff(normalized, 'day') > 1 && dayjs().diff(normalized, 'day') < 7) {
		return dayjs().to(normalized);
	} else {
		return normalized.format('L');
	}
};
