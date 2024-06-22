<script lang="ts">
	import type { Source } from '$lib/models';
	import Irodori from '$assets/irodori.webp';
	import Fakku from '$assets/fakku.svg';
	import Anchira from '$assets/anchira.webp';
	import HentaiNexus from '$assets/hentainexus.webp';
	import ExHentai from '$assets/exhentai.ico';
	import Pixiv from '$assets/pixiv.webp';
	import Patreon from '$assets/patreon.webp';
	import ProjectHentai from '$assets/project-hentai.webp';
	import HenTag from '$assets/hentag.webp';
	import IcBaselineQuestionMark from '~icons/ic/baseline-question-mark';

	export let source: Source;

	$: image = (() => {
		switch (source.name.toLowerCase()) {
			case 'fakku':
				return Fakku;
			case 'irodori comics':
				return Irodori;
			case 'anchira':
				return Anchira;
			case 'hentainexus':
				return HentaiNexus;
			case 'e-hentai':
				return ExHentai;
			case 'exhentai':
				return ExHentai;
			case 'pixiv':
				return Pixiv;
			case 'patreon':
				return Patreon;
			case 'project hentai':
				return ProjectHentai;
			case 'hentag':
				return HenTag;
			default:
				return;
		}
	})();

	$: style = (() => {
		switch (source.name.toLowerCase()) {
			case 'fakku':
				return 'background: #AB2328; padding: 0.25rem';
			case 'irodori comics':
				return 'background: #4449FB; padding: 0.3125rem';
			case 'e-hentai':
				return 'background: #DFDDD2;';
			case 'exhentai':
				return 'background: black; filter: brightness(1.25);';
			case 'project hentai':
				return 'background: #35393B; padding: 0.125rem';
			case 'hentag':
				return 'background: #101827; padding: 0.125rem';
			case 'patreon':
				return 'background: white; padding: 0.125rem';
			case 'hentainexus':
				return 'background: black;';
		}
	})();
</script>

<a
	href={source.url}
	title={source.name}
	target="_blank"
	class="flex size-6 items-center justify-center overflow-clip rounded-md bg-neutral-400"
	{style}
>
	{#if image}
		<img src={image} alt={`${source.name} icon`} />
	{:else}
		<IcBaselineQuestionMark class="text-black" />
	{/if}
</a>
