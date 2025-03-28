import { browser } from '$app/environment';
import Cookie from 'cookie';
import dayjs from 'dayjs';
import { z } from 'zod';
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
	preset: z.string().nullish().catch(undefined),
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

export type ScalingOption = { value: Scaling; label: string; style: string };

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
	{ value: 'original', label: 'Original', style: '' },
	{
		value: 'fill-width',
		label: 'Fill screen width',
		style: 'width: 100%;',
	},
	{
		value: 'fill-height',
		label: 'Fill screen height',
		style: 'height: 100%; width: auto;',
	},
];

export const reverseLayoutOptions = [
	{ value: 'none', label: 'None' },
	{ value: 'vertical', label: 'Vertical' },
	{ value: 'horizontal', label: 'Horizontal' },
	{ value: 'both', label: 'Both' },
] satisfies { value: ReverseLayout; label: string }[];

class ReaderState {
	initialized = false;
	settings = $state<ReaderSettings>();

	get preset() {
		return this.settings?.preset;
	}

	get reverseLayout() {
		return this.settings?.reverseLayout;
	}

	get readingMode() {
		return this.settings?.readingMode;
	}

	get verticalGap() {
		return this.settings?.verticalGap;
	}

	get scaling() {
		return this.settings?.scaling;
	}

	get minWidth() {
		return this.settings?.minWidth;
	}

	get maxWidth() {
		return this.settings?.maxWidth;
	}

	get touchLayout() {
		return this.settings?.touchLayout;
	}

	get toolbarPosition() {
		return this.settings?.toolbarPosition;
	}

	init(defaultPreset: ReaderPreset | null | undefined) {
		if (this.initialized) {
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

		this.settings = settings;

		if (this.settings) {
			this.initialized = true;
		}
	}

	updateCookie(settings: ReaderSettings) {
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

	setImagePreset(value: ReaderPreset | null) {
		if (this.settings) {
			this.settings.preset = value?.hash ?? null;
		}
	}

	setReadingMode(value: string) {
		if (this.settings) {
			this.settings.readingMode = value as ReadingMode;
		}
	}

	setVerticalGap(value: number) {
		if (this.settings) {
			this.settings.verticalGap = value;
		}
	}

	setScaling(value: string) {
		if (this.settings) {
			this.settings.scaling = value as Scaling;
		}
	}

	setMinWidth(value: number) {
		if (this.settings) {
			this.settings.minWidth = value;
		}
	}

	setMaxWidth(value: number) {
		if (this.settings) {
			this.settings.maxWidth = value;
		}
	}

	setTouchLayout(value: string) {
		if (this.settings) {
			this.settings.touchLayout = value as TouchLayout;
		}
	}

	setReverseLayout(value: string) {
		if (this.settings) {
			this.settings.reverseLayout = value as ReverseLayout;
		}
	}

	setToolbarPosition(value: string) {
		if (this.settings) {
			this.settings.toolbarPosition = value as ToolbarPosition;
		}
	}
}

export const readerState = new ReaderState();

$effect(() => {
	try {
		document.cookie = Cookie.serialize('reader', JSON.stringify(readerState.settings), {
			expires: dayjs().add(1, 'year').toDate(),
			httpOnly: false,
			path: '/',
		});
	} catch {
		/* empty */
	}
});

export type TouchLayoutOption = { name: TouchLayout; rows: string[][] };

const touchLayoutOptions = $derived.by(() => {
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

	switch (readerState.reverseLayout) {
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

export const getTouchLayoutOptions = () => touchLayoutOptions;
