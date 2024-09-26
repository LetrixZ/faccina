import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
			},
		},
	},
	{
		plugins: {
			perfectionist,
		},
		rules: {
			'perfectionist/sort-imports': [
				'error',
				{
					type: 'natural',
					order: 'asc',
				},
			],
			'perfectionist/sort-named-imports': [
				'error',
				{
					type: 'natural',
					order: 'asc',
				},
			],
			'perfectionist/sort-svelte-attributes': [
				'error',
				{
					type: 'natural',
					order: 'asc',
				},
			],
		},
	},
	{
		ignores: ['build/', '.svelte-kit/', 'dist/'],
	},
	{
		ignores: ['**/ui'],
	},
	{
		files: ['migrations/**'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
		},
	},
];
