import Cookie from 'cookie';
import dayjs from 'dayjs';
import { derived, writable } from 'svelte/store';
import { z } from 'zod';
import { browser } from '$app/environment';
import type { ReaderPreset } from '~shared/config/image.schema';

export const readingModes = ['paged', 'continuous-vertical'] as const;
export type ReadingMode = (typeof readingModes)[number];

export const toolbarPositions = ['top', 'bottom'] as const;
export type ToolbarPosition = (typeof toolbarPositions)[number];

export const scalings = ['original', 'fill-width', 'fill-height'] as const;
export type Scaling = (typeof scalings)[number];

export const touchLayouts = ['sides', 'l', 'kindle'] as const;
export type TouchLayout = (typeof touchLayouts)[number];

export const reverseLayouts = ['none', 'vertical', 'horizontal', 'both'] as const;
export type ReverseLayout = (typeof reverseLayouts)[number];

const readerSettingsSchema = z.object({
	preset: z.string().nullable().catch(null),
	readingMode: z.enum(readingModes).catch('paged'),
	verticalGap: z.number().catch(0),
	scaling: z.enum(scalings).catch('original'),
	touchLayout: z.enum(touchLayouts).catch('sides'),
	reverseLayout: z.enum(reverseLayouts).catch('none'),
	toolbarPosition: z.enum(toolbarPositions).catch('bottom'),
	minWidth: z.number().catch(0),
	maxWidth: z.number().catch(0),
});

export type ReaderSettings = z.infer<typeof readerSettingsSchema>;

export type ScalingOption = { value: Scaling; label: string; style: string; previewStyle: string };

export const readingModeOptions = [
	{
		value: 'paged',
		label: 'Paged',
	},
	{
		value: 'continuous-vertical',
		label: 'Continuous vertical',
	},
] satisfies { value: ReadingMode; label: string }[];

export const scalingOptions: ScalingOption[] = [
	{ value: 'original', label: 'Original', style: '', previewStyle: 'width: 70%;' },
	{
		value: 'fill-width',
		label: 'Fill screen width',
		style: 'width: 100%;',
		previewStyle: 'width: 100%;',
	},
	{
		value: 'fill-height',
		label: 'Fill screen height',
		style: 'height: 100%; width: auto;',
		previewStyle: 'height: 100%;',
	},
];

export const reverseLayoutOptions = [
	{ value: 'none', label: 'None' },
	{ value: 'vertical', label: 'Vertical' },
	{ value: 'horizontal', label: 'Horizontal' },
	{ value: 'both', label: 'Both' },
] satisfies { value: ReverseLayout; label: string }[];

function createReaderStore() {
	const store = writable<ReaderSettings | undefined>();

	function init() {
		let settings: ReaderSettings | undefined = undefined;

		if (browser) {
			const json = Cookie.parse(document.cookie).reader;

			if (json) {
				try {
					settings = readerSettingsSchema.parse(JSON.parse(json));
				} catch {
					/* empty */
				}
			}

			if (!settings) {
				settings = readerSettingsSchema.parse({});
			}
		}

		store.set(settings);
	}

	function updateCookie(settings: ReaderSettings) {
		try {
			document.cookie = Cookie.serialize('reader', JSON.stringify(settings), {
				expires: dayjs().add(1, 'year').toDate(),
				httpOnly: false,
				path: '/',
			});
		} catch {
			/* empty */
		}

		return settings;
	}

	function setImagePreset(value: ReaderPreset | null) {
		store.update((settings) => {
			if (settings) {
				settings.preset = value?.hash ?? null;
				return updateCookie(settings);
			}

			return settings;
		});
	}

	function setReadingMode(value: string) {
		store.update((settings) => {
			if (settings) {
				settings.readingMode = value as ReadingMode;
				return updateCookie(settings);
			}

			return settings;
		});
	}

	function setVerticalGap(value: number) {
		store.update((settings) => {
			if (settings) {
				settings.verticalGap = value;
				return updateCookie(settings);
			}

			return settings;
		});
	}

	function setScaling(value: string) {
		store.update((settings) => {
			if (settings) {
				settings.scaling = value as Scaling;
				return updateCookie(settings);
			}

			return settings;
		});
	}

	function setMinWidth(value: number) {
		store.update((settings) => {
			if (settings) {
				settings.minWidth = value;
				return updateCookie(settings);
			}

			return settings;
		});
	}

	function setMaxWidth(value: number) {
		store.update((settings) => {
			if (settings) {
				settings.maxWidth = value;
				return updateCookie(settings);
			}

			return settings;
		});
	}

	function setTouchLayout(value: string) {
		store.update((settings) => {
			if (settings) {
				settings.touchLayout = value as TouchLayout;
				return updateCookie(settings);
			}

			return settings;
		});
	}

	function setReverseLayout(value: string) {
		store.update((settings) => {
			if (settings) {
				settings.reverseLayout = value as ReverseLayout;
				return updateCookie(settings);
			}

			return settings;
		});
	}

	function setToolbarPosition(value: string) {
		store.update((settings) => {
			if (settings) {
				settings.toolbarPosition = value as ToolbarPosition;
				return updateCookie(settings);
			}

			return settings;
		});
	}

	init();

	return {
		subscribe: store.subscribe,
		setImagePreset,
		setReadingMode,
		setVerticalGap,
		setScaling,
		setMaxWidth,
		setMinWidth,
		setTouchLayout,
		setReverseLayout,
		setToolbarPosition,
	};
}

export const readerStore = createReaderStore();

export type TouchLayoutOption = { name: TouchLayout; rows: string[][] };

export const touchLayoutOptions = derived(readerStore, (reader) => {
	const layouts = [
		{ name: 'sides', rows: [['p', 'p', '', 'n', 'n']] },
		{
			name: 'l',
			rows: [
				['p', 'p', 'p', 'p', 'p'],
				['p', 'p', 'p', 'p', 'p'],
				['p', 'p', '', 'n', 'n'],
				['p', 'p', '', 'n', 'n'],
				['p', 'p', '', 'n', 'n'],
				['n', 'n', 'n', 'n', 'n'],
				['n', 'n', 'n', 'n', 'n'],
			],
		},
		{
			name: 'kindle',
			rows: [
				['', '', '', '', '', ''],
				['', '', '', '', '', ''],
				['p', 'p', 'n', 'n', 'n', 'n'],
				['p', 'p', 'n', 'n', 'n', 'n'],
				['p', 'p', 'n', 'n', 'n', 'n'],
				['p', 'p', 'n', 'n', 'n', 'n'],
			],
		},
	] satisfies TouchLayoutOption[];

	switch (reader?.reverseLayout) {
		case 'vertical':
			layouts.forEach((layout) => layout.rows.reverse());
			break;
		case 'horizontal':
			layouts.forEach((layout) => layout.rows.forEach((rows) => rows.reverse()));
			break;
		case 'both':
			layouts.forEach((layout) => {
				layout.rows.reverse();
				layout.rows.forEach((rows) => rows.reverse());
			});
			break;
	}

	return layouts;
});
