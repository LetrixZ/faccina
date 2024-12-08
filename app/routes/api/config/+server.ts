import { json } from '@sveltejs/kit';
import config from '~shared/config';

export const GET = () => {
	return json({
		reader: {
			presets: config.image.readerPresets.map((preset) => ({
				name: preset.name,
				label: preset.label,
			})),
			defaultPreset: config.image.readerDefaultPreset,
			allowOriginal: config.image.readerAllowOriginal,
		},
	});
};
