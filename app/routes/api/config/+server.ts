import { json } from '@sveltejs/kit';
import config from '~shared/config';

export const GET = () => {
	return json({
		imageServer: config.site.imageServer,
		reader: {
			presets: config.image.readerPresets.map((preset) => ({
				name: preset.name,
				hash: preset.hash,
				label: preset.label,
			})),
			defaultPreset: config.image.readerDefaultPreset,
			allowOriginal: config.image.readerAllowOriginal,
		},
	});
};
