import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default ts.config(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
		},
		rules: { 'no-undef': 'off' },
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		ignores: ['eslint.config.js', 'svelte.config.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig,
			},
		},
	},
	{
		rules: { curly: ['error'] },
	},
	{
		plugins: { perfectionist },
		rules: {
			'perfectionist/sort-imports': [
				'error',
				{
					type: 'natural',
					newlinesBetween: 'never',
					internalPattern: ['^$~/.*'],
					groups: [
						'internal',
						'internal-type',
						['builtin', 'external'],
						['parent-type', 'sibling-type', 'index-type'],
						['parent', 'sibling', 'index'],
						'object',
						'type',
						'unknown',
					],
				},
			],
		},
	},
	{
		plugins: { svelte },
		rules: { 'svelte/sort-attributes': ['warn'] },
	},
	{ ignores: ['**/ui'] },
	{
		files: ['shared/db/migrations/**'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	}
);
