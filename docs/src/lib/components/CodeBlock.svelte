<script lang="ts">
	import dedent from 'dedent';
	import { StreamLanguage } from '@codemirror/language';
	import { toml as tomlLang } from '@codemirror/legacy-modes/mode/toml';
	import { githubDark } from '@ddietr/codemirror-themes/github-dark';
	import CodeMirror from 'svelte-codemirror-editor';

	let { value } = $props<{ value: string }>();
</script>

<CodeMirror
	value={dedent(value)}
	extensions={[StreamLanguage.define(tomlLang)]}
	theme={githubDark}
	class="overflow-auto rounded-lg"
/>
