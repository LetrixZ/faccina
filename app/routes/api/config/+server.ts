import { json } from '@sveltejs/kit';
import config from '~shared/config';

export const GET = () => {
	return json({
		readerPresets: config.image.readerPresets.map((preset) => ({
			name: preset.name,
			label: preset.label,
		})),
	});
};
