import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import type { Archive, Image } from './models';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

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
export function humanFileSize(size: number) {
	var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
	return +(size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

export function dateFormat(date: Date) {
	return date.toLocaleDateString([], {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
}

export function encodeURL(url: string) {
	return encodeURI(url).replace(/#/g, '%23');
}

export function generateFilename(archive: Archive) {
	const { artists, circles, magazines } = archive;
	const splits: string[] = [];

	if (!circles.length) {
		if (artists.length === 1) {
			splits.push(`[${artists[0].name}]`);
		} else if (artists.length === 2) {
			splits.push(`[${artists[0].name} & ${artists[1].name}]`);
		} else if (artists.length > 2) {
			splits.push(`[Various]`);
		}
	} else if (circles.length === 1) {
		if (artists.length === 1) {
			splits.push(`[${circles[0].name} (${artists[0].name})]`);
		} else if (artists.length === 2) {
			splits.push(`[${circles[0].name} (${artists[0].name} & ${artists[1].name})]`);
		} else {
			splits.push(`[${circles[0].name}]`);
		}
	} else {
		splits.push(`[Various]`);
	}

	splits.push(archive.title);

	if (magazines.length === 1) {
		splits.push(`(${magazines[0].name})`);
	}

	return splits
		.join(' ')
		.replace('\u{FF0A}', '*')
		.replace('\u{FF1F}', '?')
		.replace('\u{2044}', '/')
		.replace('\u{A792}', ':');
}

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
	['story arc', 2],
	['group', 6],
];

export function isSpread(image: Image) {
	return image.width > image.height;
}
