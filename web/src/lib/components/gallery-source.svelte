<script lang="ts">
	import IcBaselineQuestionMark from '~icons/ic/baseline-question-mark';
	import Anchira from '$assets/anchira.png';
	import EHentai from '$assets/e-hentai.png';
	import Fakku from '$assets/fakku.svg';
	import HenTag from '$assets/hentag.png';
	import HentaiNexus from '$assets/hentainexus.png';
	import Irodori from '$assets/irodori.png';
	import Patreon from '$assets/patreon.png';
	import Pixiv from '$assets/pixiv.png';
	import ProjectHentai from '$assets/project-hentai.png';
	import type { Source } from '$lib/models';

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
				return EHentai;
			case 'exhentai':
				return EHentai;
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
				return 'background: #AB2328; padding: 0.275rem';
			case 'irodori comics':
				return 'background: #4449FB; padding: 0.3125rem';
			case 'e-hentai':
				return 'background: #DFDDD2; padding: 0.3125rem';
			case 'exhentai':
				return 'background: black; filter: brightness(1.25); padding: 0.3125rem';
			case 'project hentai':
				return 'background: #35393B; padding: 0.125rem';
			case 'hentag':
				return 'background: #101827; padding: 0.25rem';
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
