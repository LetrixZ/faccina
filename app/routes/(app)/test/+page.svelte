<script lang="ts">
	import { page } from '$app/state';
	import ListPagination from '$lib/components/list-pagination.svelte';
	import Button from '$lib/components/newnew/button.svelte';
	import { Query } from '$lib/query.svelte';
	import { appState } from '$lib/state.svelte';
	import { apiUrl } from '$lib/utils';
	import { BookOpenText, Download, LogIn, LogOut, UserPlus } from '@lucide/svelte';
	import { FastAverageColor } from 'fast-average-color';
	import { onMount } from 'svelte';
	import type { Gallery } from '$lib/types';

	type TRGB = { r: number; g: number; b: number };
	type TLCH = { l: number; c: number; h: number };

	const rgbToOklch = (rgb: TRGB): TLCH => {
		const r = rgb.r / 255;
		const g = rgb.g / 255;
		const b = rgb.b / 255;

		// Apply sRGB to Linear RGB conversion
		let linearR: number, linearG: number, linearB: number;
		[linearR, linearG, linearB] = [r, g, b].map((c: number) =>
			c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
		);

		// Convert Linear RGB to CIE XYZ
		let x: number = linearR * 0.4124564 + linearG * 0.3575761 + linearB * 0.1804375;
		let y: number = linearR * 0.2126729 + linearG * 0.7151522 + linearB * 0.072175;
		let z: number = linearR * 0.0193339 + linearG * 0.119192 + linearB * 0.9503041;

		// Convert CIE XYZ to CIELAB
		[x, y, z] = [x, y, z].map((c: number) =>
			c > 0.008856 ? c ** (1 / 3) : (903.3 * c + 16) / 116
		);
		let l: number = 116 * y - 16;
		let a: number = 500 * (x - y);
		let bStar: number = 200 * (y - z);

		// Convert CIELAB to Oklch
		//let c: number = Math.sqrt(a * a + bStar * bStar);
		let h: number = Math.atan2(bStar, a) * (180 / Math.PI);
		if (h < 0) {
			h += 360;
		}

		// Assume c_max is the maximum chroma value observed or expected in your conversions
		const c_max = 100; /* your determined or observed maximum chroma value */
		// Adjusted part of the rgbToOklch function for calculating 'c'
		let c: number = Math.sqrt(a * a + bStar * bStar);
		c = (c / c_max) * 0.37; // Scale c to be within 0 and 0.37

		// Scale and round values to match the specified ranges
		l = Math.round(((l + 16) / 116) * 1000) / 1000; // Scale l to be between 0 and 1
		c = Number(c.toFixed(2)); // Ensure c is correctly scaled, adjust if necessary based on your color space calculations
		h = Number(h.toFixed(1)); // h is already within 0 to 360

		return {
			l,
			c,
			h,
		};
	};

	const rgbToOklchString = (rgb: TRGB): string => {
		const { l, c, h } = rgbToOklch(rgb);
		return `oklch(${l} ${c} ${h})`;
	};

	let galleries: Gallery[] = $state([]);
	let images: HTMLImageElement[] = $state([]);
	let galleryColors: string[] = $state([]);

	const fac = new FastAverageColor();

	const fetchIds = async () => {
		for (const id of [11, 38, 40, 32, 34]) {
			const res = await fetch(`${apiUrl}/api/v1/gallery/${id}`);
			if (res.ok) {
				const gallery = await res.json();
				galleries.push(gallery);
			}
		}
	};

	const { data } = $props();
	const query = $derived(Query.fromURL(page.url, data.site));

	onMount(() => {
		fetchIds();
	});
</script>

{#snippet buttons(gallery: Gallery | null)}
	<div class="flex flex-col items-center gap-2">
		<div class="grid w-full grid-cols-2 gap-2">
			<div class="flex flex-col gap-2">
				<Button icon={LogIn} onclick={() => (appState.currentGallery = gallery?.id)}>Login</Button>
				<Button icon={LogOut} onclick={() => (appState.currentGallery = gallery?.id)}>
					Logout
				</Button>
				<Button icon={UserPlus} onclick={() => (appState.currentGallery = gallery?.id)}>
					Register
				</Button>
			</div>

			<div class="flex flex-col gap-2">
				<Button
					icon={LogIn}
					iconSide="start"
					onclick={() => (appState.currentGallery = gallery?.id)}
				>
					Login
				</Button>
				<Button
					icon={LogOut}
					iconSide="start"
					onclick={() => (appState.currentGallery = gallery?.id)}
				>
					Logout
				</Button>
				<Button
					icon={UserPlus}
					iconSide="start"
					onclick={() => (appState.currentGallery = gallery?.id)}
				>
					Register
				</Button>
			</div>
		</div>

		<Button
			class="w-48"
			centered
			color="green"
			icon={Download}
			iconSide="start"
			onclick={() => (appState.currentGallery = gallery?.id)}
		>
			Download
		</Button>
		<Button
			class="w-48"
			centered
			color="blue"
			icon={BookOpenText}
			iconSide="start"
			onclick={() => (appState.currentGallery = gallery?.id)}
		>
			Start Reading
		</Button>
	</div>
{/snippet}

<div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
	{#each galleries as gallery, i (gallery.id)}
		<div
			style="--color-accent: {galleryColors[i]}"
			class="buttons flex flex-col gap-4 rounded-2xl p-8 shadow"
		>
			<ListPagination
				class="mx-auto"
				library={{ data: [], limit: 1, page: query.page, total: 20 }}
			/>

			{@render buttons(gallery)}

			<img
				bind:this={images[i]}
				class="mx-auto aspect-[45/64] w-[60%] rounded-sm object-contain shadow"
				alt="'{gallery.title}' cover"
				crossorigin="anonymous"
				height={910}
				loading="eager"
				onload={() => {
					const color = fac.getColor(images[i]!, { algorithm: 'dominant' }).value;
					appState.colors.set(gallery.id, color);
					const [r, g, b] = color;
					galleryColors[i] = rgbToOklchString({ r, g, b });
				}}
				src="{apiUrl}/image/{gallery.hash}/{gallery.thumbnail}?type=cover"
				width={640}
			/>
		</div>
	{/each}

	<div
		style="--color-accent: var(--color-neutral-800);"
		class="buttons flex flex-col gap-4 rounded-2xl p-8 shadow"
	>
		<ListPagination class="mx-auto" library={{ data: [], limit: 1, page: query.page, total: 20 }} />

		{@render buttons(null)}
	</div>
</div>

<style>
	.buttons {
		--color-background: color-mix(in oklab, var(--color-neutral-950) 95%, var(--color-accent));
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--app-color), var(--color-background) var(--app-mix-percentage)),
			transparent
		);
		background-color: var(--color-background);
	}

	.buttons {
		box-shadow: 0 0 5px 0 --alpha(var(--color-accent) / 20%);
	}
</style>
