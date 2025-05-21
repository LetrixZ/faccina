import { dev } from '$app/environment';
import { PUBLIC_API_URL } from '$env/static/public';
import { presetSchema } from '$lib/image-presets';
import { error } from '@sveltejs/kit';
import chalk from 'chalk';
import { clsx, type ClassValue } from 'clsx';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { FastAverageColor } from 'fast-average-color';
import { gunzipSync, strFromU8 } from 'fflate';
import * as R from 'ramda';
import _slugify from 'slugify';
import { cubicOut } from 'svelte/easing';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';
import type { Gallery, Image, Tag } from './types';
import { ImageSize, TouchLayout } from './models';
import type { TransitionConfig } from 'svelte/transition';
import type { ReaderPreset } from '~shared/config/image.schema';

export type RGBA = [number, number, number, number];

export const apiUrl = dev ? '' : PUBLIC_API_URL;

_slugify.extend({ '.': '-', _: '-', '+': '-' });

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

export const cn = (...inputs: ClassValue[]) => {
	return twMerge(clsx(inputs));
};

type FlyAndScaleParams = {
	y?: number;
	x?: number;
	start?: number;
	duration?: number;
};

export const flyAndScale = (node: Element, params?: FlyAndScaleParams): TransitionConfig => {
	if (!params || !Object.keys(params).length) {
		params = { y: -8, x: 0, start: 0.95, duration: 150 };
	}

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
			if (style[key] === undefined) {
				return str;
			}
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

export const getMetadata = (gallery: Gallery, origin: string) => {
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
		Source: `${origin}/g/${gallery.id}`,
		URL: gallery.sources.map((source) => source.url),
		Released:
			gallery.releasedAt !== null ? new Date(gallery.releasedAt).getTime() / 1000 : undefined,
		Thumbnail: gallery.thumbnail - 1,
	};
};

export const preferencesSchema = z.object({
	imageSize: z.nativeEnum(ImageSize).catch(ImageSize.Original),
	touchLayout: z.nativeEnum(TouchLayout).catch(TouchLayout.LeftToRight),
	minWidth: z.number().optional(),
	maxWidth: z.number().optional().default(1280),
	barPlacement: z.enum(['top', 'bottom']).catch('bottom'),
	preset: presetSchema.and(z.object({ name: z.string() })).optional(),
});

export interface ReaderPreferences {
	imageSize: ImageSize;
	touchLayout: TouchLayout;
	minWidth: number | undefined;
	maxWidth: number | undefined;
	barPlacement: 'top' | 'bottom';
	preset: string | undefined;
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
		temporaryValue = array[currentIndex]!;
		array[currentIndex] = array[randomIndex]!;
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
	!['artist', 'author', 'circle', 'group', 'magazine', 'event', 'publisher', 'parody'].includes(
		tag.namespace
	);

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

export const formatLabel = (format: string) => {
	switch (format) {
		case 'webp':
			return 'WebP';
		case 'jpeg':
			return 'JPEG';
		case 'png':
			return 'PNG';
		case 'avif':
			return 'AVIF';
		case 'jxl':
			return 'JXL';
		default:
			return format;
	}
};

export function getImageDimensions(image: Image, preset: ReaderPreset | undefined) {
	const width = preset?.width ?? image.width!;
	const height = preset?.width
		? Math.round((preset?.width * image.height!) / image.width!)
		: image.height!;

	return { width, height };
}

export function getImageUrl(
	page: number,
	gallery: Gallery,
	selectedPreset: ReaderPreset | undefined,
	imageServer: string
) {
	return selectedPreset
		? `${imageServer}/image/${gallery.hash}/${page}?type=${selectedPreset.hash}`
		: `${imageServer}/image/${gallery.hash}/${page}`;
}

export const getDominantColor = (image: HTMLImageElement): RGBA => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		return [0, 0, 0, 1];
	}

	ctx.reset();
	ctx.drawImage(image, 0, 0, 1, 1);

	const color = ctx
		.getImageData(0, 0, 1, 1)
		.data.slice(0, 3)
		.reduce((acc, c) => [...acc, c], [] as number[]);

	canvas.remove();

	return color as RGBA;
};

export const sleep = (time?: number) => new Promise<void>((r) => setTimeout(r, time));

export const mainSortOptions = [
	{ value: 'released_at', label: 'Date released' },
	{ value: 'created_at', label: 'Date added' },
	{ value: 'title', label: 'Title' },
	{ value: 'pages', label: 'Pages' },
	{ value: 'random', label: 'Random' },
];

export function getDisplayTags(infoContainer: HTMLElement, tags: Tag[], maxLines: number) {
	const lineHeights = new Set<number>();

	const displayTags: { tag: Tag; element: HTMLAnchorElement }[] = [];

	const container = document.createElement('div');
	container.classList.add(
		'w-full',
		'h-fit',
		'flex',
		'flex-wrap',
		'gap-1',
		'px-1.5',
		'invisible',
		'absolute'
	);

	infoContainer.appendChild(container);

	for (const tag of tags) {
		const tagElement = document.createElement('a');
		tagElement.classList.add(
			'flex',
			'rounded-2xl',
			'px-1.5',
			'py-1',
			'text-xs',
			'leading-3',
			'font-semibold',
			'duration-100'
		);

		const namespace = [
			'artist',
			'circle',
			'magazine',
			'event',
			'publisher',
			'parody',
			'tag',
		].includes(tag.namespace)
			? null
			: tag.namespace;

		let label: string;

		if (namespace) {
			label = `${namespace}:${tag.name}`;
		} else {
			label = tag.name;
		}

		tagElement.innerHTML = label;

		container.appendChild(tagElement);

		lineHeights.add(container.clientHeight);

		if (lineHeights.size > maxLines) {
			lineHeights.delete(container.clientHeight);
			tagElement.remove();
			break;
		}

		displayTags.push({ tag, element: tagElement });
	}

	const moreCount = tags.length - displayTags.length;

	if (moreCount) {
		const moreElement = document.createElement('span');
		moreElement.classList.add('flex', 'px-2', 'py-1', 'text-xs', 'leading-3', 'font-semibold');
		moreElement.innerHTML = `+ ${moreCount}`;

		container.appendChild(moreElement);

		lineHeights.add(container.clientHeight);

		while (lineHeights.size > maxLines) {
			lineHeights.delete(container.clientHeight);
			displayTags[displayTags.length - 1]?.element.remove();
			displayTags.splice(-1, 1);

			lineHeights.add(container.clientHeight);
		}
	}

	container.remove();

	return displayTags.map(({ tag }) => tag);
}

export const isMonochrome = (rgb?: RGBA) => rgb?.every((c) => Math.abs(c - rgb[0]) <= 5);

export const testSources = [
	'FAKKU',
	'Irodori Comics',
	'Anchira',
	'HentaiNexus',
	'E-Hentai',
	'ExHentai',
	'Pixiv',
	'Patreon',
	'Project Hentai',
	'HenTag',
	'Koharu',
].map((s) => ({ name: s }));

type TRGB = { r: number; g: number; b: number };
type TLCH = { l: number; c: number; h: number };

const rgbToOklch = (rgb: TRGB): TLCH => {
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;

	// Apply sRGB to Linear RGB conversion
	const [linearR, linearG, linearB] = [r, g, b].map((c: number) =>
		c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
	);

	// Convert Linear RGB to CIE XYZ
	let x: number = linearR * 0.4124564 + linearG * 0.3575761 + linearB * 0.1804375;
	let y: number = linearR * 0.2126729 + linearG * 0.7151522 + linearB * 0.072175;
	let z: number = linearR * 0.0193339 + linearG * 0.119192 + linearB * 0.9503041;

	// Convert CIE XYZ to CIELAB
	[x, y, z] = [x, y, z].map((c: number) => (c > 0.008856 ? c ** (1 / 3) : (903.3 * c + 16) / 116));
	let l: number = 116 * y - 16;
	const a: number = 500 * (x - y);
	const bStar: number = 200 * (y - z);

	// Convert CIELAB to Oklch
	//let c: number = Math.sqrt(a * a + bStar * bStar);
	let h: number = Math.atan2(bStar, a) * (180 / Math.PI);
	if (h < 0) {
		h += 360;
	}

	// Assume c_max is the maximum chroma value observed or expected in your conversions
	const c_max = 100; /* your determined or observed maximum chroma value */
	// Adjusted part of the rgbToOklch function for calculating 'c'
	let c: number = Math.sqrt(a * a + bStar * bStar);
	c = (c / c_max) * 0.37; // Scale c to be within 0 and 0.37

	// Scale and round values to match the specified ranges
	l = Math.round(((l + 16) / 116) * 1000) / 1000; // Scale l to be between 0 and 1
	c = Number(c.toFixed(2)); // Ensure c is correctly scaled, adjust if necessary based on your color space calculations
	h = Number(h.toFixed(1)); // h is already within 0 to 360

	return {
		l,
		c,
		h,
	};
};

export const rgbToOklchString = (rgb: TRGB): string => {
	const { l, c, h } = rgbToOklch(rgb);
	return `oklch(${l} ${c} ${h})`;
};

const fac = new FastAverageColor();

export const getColor = (image: HTMLImageElement) => {
	const color = fac.getColor(image, { algorithm: 'dominant' }).value;
	const [r, g, b] = color;
	return rgbToOklchString({ r, g, b });
};
