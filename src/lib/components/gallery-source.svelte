<script lang="ts">
	import Anchira from '$lib/assets/anchira.webp';
	import ExHentai from '$lib/assets/exhentai.ico';
	import Fakku from '$lib/assets/fakku.svg';
	import HenTag from '$lib/assets/hentag.webp';
	import HentaiNexus from '$lib/assets/hentainexus.webp';
	import Irodori from '$lib/assets/irodori.webp';
	import Koharu from '$lib/assets/koharu.png';
	import Patreon from '$lib/assets/patreon.webp';
	import Pixiv from '$lib/assets/pixiv.webp';
	import ProjectHentai from '$lib/assets/project-hentai.webp';
	import { cn } from '../utils';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	let {
		source,
		class: className,
		...restProps
	}: {
		source: { name: string; url?: string | null };
	} & HTMLAnchorAttributes = $props();

	const image = $derived.by(() => {
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
	});

	const style = $derived.by(() => {
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
	});
</script>

<a
	{...restProps}
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
