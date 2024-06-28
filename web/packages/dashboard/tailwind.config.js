/* eslint-disable @typescript-eslint/no-require-imports */

/** @type {import('tailwindcss').Config} */
const config = {
	presets: [require('../shared/tailwind.config')],
	content: ['./src/**/*.{html,js,svelte,ts}', '../shared/**/*.{html,js,svelte,ts}'],
	plugins: [require('@tailwindcss/container-queries')]
};

export default config;
