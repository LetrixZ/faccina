import { browser } from '$app/environment';
import Cookie from 'cookie';
import dayjs from 'dayjs';
import { z } from 'zod/v3';
import type { ReaderPreset } from '~shared/config/image.schema.js';

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
	preset: z.string().nullish().catch(undefined),
	readingMode: z.enum(readingModes).catch('paged'),
	verticalGap: z.number().catch(0),
	scaling: z.enum(scalings).catch('original'),
	touchLayout: z.enum(touchLayouts).catch('sides'),
	reverseLayout: z.enum(reverseLayouts).catch('none'),
	toolbarPosition: z.enum(toolbarPositions).catch('bottom'),
	minWidth: z.number().catch(0),
	maxWidth: z.number().catch(0)
});

export type ReaderSettings = z.infer<typeof readerSettingsSchema>;

export type ScalingOption = { value: Scaling; label: string; style: string };

export const readingModeOptions = [
	{ value: 'paged', label: 'Paged' },
	{ value: 'continuous-vertical', label: 'Continuous vertical' }
] satisfies { value: ReadingMode; label: string }[];

export const scalingOptions: ScalingOption[] = [
	{ value: 'original', label: 'Original', style: '' },
	{ value: 'fill-width', label: 'Fill screen width', style: 'width: 100%;' },
	{ value: 'fill-height', label: 'Fill screen height', style: 'height: 100%; width: auto;' }
];

export const reverseLayoutOptions = [
	{ value: 'none', label: 'None' },
	{ value: 'vertical', label: 'Vertical' },
	{ value: 'horizontal', label: 'Horizontal' },
	{ value: 'both', label: 'Both' }
] satisfies { value: ReverseLayout; label: string }[];

function createReader() {
	let initialized = false;
	let reader = $state<ReaderSettings | undefined>(undefined);

	function init(defaultPreset: ReaderPreset | null | undefined) {
		if (initialized) {
			return;
		}

		let settings: ReaderSettings | undefined = undefined;

		if (browser) {
			const json = Cookie.parse(document.cookie).reader;

			if (json) {
				try {
					settings = readerSettingsSchema.parse(JSON.parse(json));
				} catch {
					/* empty */
				}
			} else {
				settings = readerSettingsSchema.parse({ preset: defaultPreset?.hash });
			}

			if (!settings) {
				settings = readerSettingsSchema.parse({});
			}
		}

		reader = settings;
		initialized = true;
	}

	function updateCookie(settings: ReaderSettings) {
		try {
			document.cookie = Cookie.serialize('reader', JSON.stringify(settings), {
				expires: dayjs().add(1, 'year').toDate(),
				httpOnly: false,
				path: '/'
			});
		} catch {
			/* empty */
		}
	}

	function setImagePreset(value: ReaderPreset | null) {
		if (!reader) {
			return;
		}

		reader.preset = value?.hash ?? null;
		updateCookie(reader);
	}

	function setReadingMode(value: string) {
		if (!reader) {
			return;
		}

		reader.readingMode = value as ReadingMode;
		updateCookie(reader);
	}

	function setVerticalGap(value: number) {
		if (!reader) {
			return;
		}

		reader.verticalGap = value;
		updateCookie(reader);
	}

	function setScaling(value: string) {
		if (!reader) {
			return;
		}

		reader.scaling = value as Scaling;
		updateCookie(reader);
	}

	function setMinWidth(value: number) {
		if (!reader) {
			return;
		}

		reader.minWidth = value;
		updateCookie(reader);
	}

	function setMaxWidth(value: number) {
		if (!reader) {
			return;
		}

		reader.maxWidth = value;
		updateCookie(reader);
	}

	function setTouchLayout(value: string) {
		if (!reader) {
			return;
		}

		reader.touchLayout = value as TouchLayout;
		updateCookie(reader);
	}

	function setReverseLayout(value: string) {
		if (!reader) {
			return;
		}

		reader.reverseLayout = value as ReverseLayout;
		updateCookie(reader);
	}

	function setToolbarPosition(value: string) {
		if (!reader) {
			return;
		}

		reader.toolbarPosition = value as ToolbarPosition;
		updateCookie(reader);
	}

	const touchLayoutOptions = $derived.by(() => {
		const layouts: TouchLayoutOption[] = [
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
					['n', 'n', 'n', 'n', 'n']
				]
			},
			{
				name: 'kindle',
				rows: [
					['', '', '', '', '', ''],
					['', '', '', '', '', ''],
					['p', 'p', 'n', 'n', 'n', 'n'],
					['p', 'p', 'n', 'n', 'n', 'n'],
					['p', 'p', 'n', 'n', 'n', 'n'],
					['p', 'p', 'n', 'n', 'n', 'n']
				]
			}
		];

		switch (reader?.reverseLayout) {
			case 'vertical':
				layouts.forEach((layout) => layout.rows.reverse());
				break;
			case 'horizontal':
				layouts.forEach((layout) => layout.rows.forEach((row) => row.reverse()));
				break;
			case 'both':
				layouts.forEach((layout) => {
					layout.rows.reverse();
					layout.rows.forEach((row) => row.reverse());
				});
				break;
		}

		return layouts;
	});

	return {
		get current() {
			return reader;
		},
		get touchLayoutOptions() {
			return touchLayoutOptions;
		},
		init,
		setImagePreset,
		setReadingMode,
		setVerticalGap,
		setScaling,
		setMaxWidth,
		setMinWidth,
		setTouchLayout,
		setReverseLayout,
		setToolbarPosition
	};
}

export const reader = createReader();

export type TouchLayoutOption = { name: TouchLayout; rows: string[][] };
