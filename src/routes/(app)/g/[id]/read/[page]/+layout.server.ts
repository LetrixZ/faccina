import config from '~shared/config';

export const load = () => {
	return {
		presets: config.image.readerPresets,
		defaultPreset: config.image.readerDefaultPreset,
		readerAllowOriginal: config.image.readerAllowOriginal,
	};
};
