<script lang="ts">
	import Anchira from '../../assets/anchira.webp';
	import ExHentai from '../../assets/exhentai.ico';
	import Fakku from '../../assets/fakku.svg';
	import HenTag from '../../assets/hentag.webp';
	import HentaiNexus from '../../assets/hentainexus.webp';
	import Irodori from '../../assets/irodori.webp';
	import Koharu from '../../assets/koharu.png';
	import Patreon from '../../assets/patreon.webp';
	import Pixiv from '../../assets/pixiv.webp';
	import ProjectHentai from '../../assets/project-hentai.webp';
	import { cn } from '../utils';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	type $Props = HTMLAnchorAttributes & { source: { name: string; url?: string | null } };

	export let source: { name: string; url?: string | null };

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
			case 'koharu':
				return Koharu;
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

	let className: $Props['class'] = undefined;

	export { className as class };
</script>

<a
	class={cn(
		'flex size-6 items-center justify-center overflow-clip rounded-md bg-neutral-400',
		className
	)}
	href={source.url}
	{style}
	target="_blank"
	title={source.name}
>
	{#if image}
		<img alt={`${source.name} icon`} src={image} />
	{:else}
		<span>?</span>
	{/if}
</a>
