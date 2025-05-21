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
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		source: { name: string; url?: string | null };
		class?: ClassValue | null;
	};

	let { source, class: className }: Props = $props();

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
</script>

<a
	class={cn(
		'flex h-5 items-center justify-center gap-1 rounded-2xl px-1.5 text-sm duration-150',
		source.name.replaceAll(' ', '-').toLowerCase(),
		className
	)}
	href={source.url}
	target="_blank"
	title={source.name}
>
	<div>
		{#if image}
			<img class="h-4" alt="{source.name} icon" src={image} />
		{:else}
			<span class="h-4">?</span>
		{/if}
	</div>

	<span class="text-xs leading-3 font-semibold"> {source.name} </span>
</a>

<style>
	a {
		--background: --alpha(var(--color-zinc-500) / 50%);
		--background-hover: --alpha(var(--color-zinc-500) / 80%);
	}

	.fakku {
		--background: #ab2328;
		--background-hover: color-mix(in oklab, var(--background), rgb(255, 255, 255) 10%);

		img {
			height: calc(var(--spacing) * 3.5);
		}
	}

	.irodori-comics {
		--background: #4449fb;
		--background-hover: color-mix(in oklab, var(--background), rgb(255, 255, 255) 10%);
	}

	.e-hentai {
		color: #670813;
		--background: #edebdf;
		--background-hover: hsl(50, 24%, 95%);
	}

	.exhentai {
		color: #670813;
		--background: #000000;
		--background-hover: #080808;
	}

	.hentainexus {
		--background: #000000;
		--background-hover: #080808;
	}

	.project-hentai {
		--background: #35393b;
		--background-hover: color-mix(in oklab, var(--background), rgb(255, 255, 255) 10%);
	}

	.anchira {
		color: #fefcfc;
		--background: #a86955;
		--background-hover: color-mix(in oklab, var(--background), rgb(255, 255, 255) 10%);

		img {
			border-radius: 100%;
		}
	}

	.koharu {
		color: #fefcfc;
		--background: #97333e;
		--background-hover: color-mix(in oklab, var(--background), rgb(255, 255, 255) 10%);

		img {
			border-radius: 100%;
		}
	}

	.hentag {
		--background: #101827;
		--background-hover: color-mix(in oklab, var(--background), rgb(255, 255, 255) 10%);
	}

	.patreon {
		color: #000000;
		--background: #ffffff;
		--background-hover: color-mix(in oklab, var(--background), rgb(255, 255, 255) 10%);
	}

	.pixiv {
		color: #fefcfc;
		--background: #0096fa;
		--background-hover: color-mix(in oklab, var(--background), rgb(255, 255, 255) 10%);
	}

	a {
		background-color: var(--background);

		&:hover {
			background-color: var(--background-hover,);
		}
	}
</style>
