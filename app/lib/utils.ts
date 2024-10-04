import type { TransitionConfig } from 'svelte/transition';

import { error } from '@sveltejs/kit';
import { type ClassValue, clsx } from 'clsx';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import _slugify from 'slugify';
import { cubicOut } from 'svelte/easing';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import {
	type ArchiveDetail,
	type Image,
	ImageSize,
	type Tag,
	type Taxonomy,
	TouchLayout,
} from './models';

_slugify.extend({ '.': '-', _: '-', '+': '-' });

dayjs.extend(localizedFormat);

export const cn = (...inputs: ClassValue[]) => {
	return twMerge(clsx(inputs));
};

type FlyAndScaleParams = {
	y?: number;
	x?: number;
	start?: number;
	duration?: number;
};

export const flyAndScale = (
	node: Element,
	params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 }
): TransitionConfig => {
	const style = getComputedStyle(node);
	const transform = style.transform === 'none' ? '' : style.transform;

	const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
		const [minA, maxA] = scaleA;
		const [minB, maxB] = scaleB;

		const percentage = (valueA - minA) / (maxA - minA);
		const valueB = percentage * (maxB - minB) + minB;

		return valueB;
	};

	const styleToString = (style: Record<string, number | string | undefined>): string => {
		return Object.keys(style).reduce((str, key) => {
			if (style[key] === undefined) return str;
			return str + `${key}:${style[key]};`;
		}, '');
	};

	return {
		duration: params.duration ?? 200,
		delay: 0,
		css: (t) => {
			const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
			const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
			const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

			return styleToString({
				transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				opacity: t,
			});
		},
		easing: cubicOut,
	};
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

export const generateFilename = (archive: ArchiveDetail) => {
	const { artists, circles, magazines } = archive;
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

export const tagsExcludeCount: string[] = ['unlimited', 'uncensored', 'hentai'];
export const tagsExcludeDisplay: string[] = [];
export const tagWeights: [string, number][] = [
	['loli', 10],
	['shota', 10],
	['petite', 10],
	['milf', 10],
	['dilf', 10],
	['ugly bastard', 10],
	['netorare', 8],
	['rape', 8],
	['forced', 8],
	['illustration', 15],
	['non-h', 15],
	['color', 10],
	['ecchi', 15],
	['catgirl', 4],
	['monster girl', 4],
	['anal', 6],
	['kogal', 7],
	['dark skin', 4],
	['mating press', 3],
	['tomboy', 4],
	['teacher', 8],
	['western', 5],
	['osananajimi', 6],
	['vanilla', 7],
	['love hotel', 5],
	['busty', 4],
	['booty', 1],
	['pubic hair', 2],
	['blowjob', 2],
	['handjob', 2],
	['footjob', 2],
	['paizuru', 2],
	['cheating', 8],
	['creampie', 3],
	['futanari', 8],
	['schoolgirl outfit', 5],
	['story arc', 2],
	['group', 6],
	['cg set', 10],
	['incest', 8],
];

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

export const getMetadata = (archive: ArchiveDetail) => {
	return {
		Title: archive.title,
		Description: archive.description ?? undefined,
		Artist: archive.artists?.length
			? archive.artists.map((artist) => artist.name)?.join(', ')
			: undefined,
		Groups: archive.circles?.length
			? archive.circles.map((circle) => circle.name)?.join(', ')
			: undefined,
		Magazine: archive.magazines?.length
			? archive.magazines.map((magazine) => magazine.name)?.join(', ')
			: undefined,
		Event: archive.events?.length
			? archive.events.map((event) => event.name)?.join(', ')
			: undefined,
		Parody: archive.parodies?.length
			? archive.parodies.map((parody) => parody.name)?.join(', ')
			: undefined,
		Publisher: archive.publishers?.length
			? archive.publishers.map((publisher) => publisher.name).join(', ')
			: undefined,
		Pages: archive.pages,
		Tags: archive.tags?.length ? archive.tags.map((tag) => tag.name) : undefined,
		Source: `https://${location.hostname}/g/${archive.id}`,
		Released: archive.released_at && new Date(archive.released_at).getTime() / 1000,
		Thumbnail: archive.thumbnail - 1,
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

export const isTag = (tag: Taxonomy | Tag): tag is Tag => {
	return (tag as Tag).namespace !== undefined;
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
