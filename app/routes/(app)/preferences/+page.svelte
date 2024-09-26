<script lang="ts">
	import { browser } from '$app/environment';
	import cookie from 'cookie';
	import { onMount } from 'svelte';

	import { Checkbox } from '~/lib/components/ui/checkbox/index';
	import Input from '~/lib/components/ui/input/input.svelte';
	import { Label } from '~/lib/components/ui/label/index';
	import { cn } from '~/lib/utils';

	export let data;

	let search = '';
	let onlyBlacklisted = false;
	let isMouted = false;

	let selectedTags: string[] = [];

	$: taxonomies = [
		...data.taxonomies.artists.map((artist) => ({
			id: `a:${artist.id}`,
			displayName: `artist:${artist.slug}`,
		})),
		...data.taxonomies.circles.map((circle) => ({
			id: `c:${circle.id}`,
			displayName: `circle:${circle.slug}`,
		})),
		...data.taxonomies.magazines.map((magazine) => ({
			id: `m:${magazine.id}`,
			displayName: `magazine:${magazine.slug}`,
		})),
		...data.taxonomies.events.map((event) => ({
			id: `e:${event.id}`,
			displayName: `event:${event.slug}`,
		})),
		...data.taxonomies.publishers.map((publisher) => ({
			id: `ps:${publisher.id}`,
			displayName: `publisher:${publisher.slug}`,
		})),
		...data.taxonomies.parodies.map((parody) => ({
			id: `p:${parody.id}`,
			displayName: `parody:${parody.slug}`,
		})),
		...data.taxonomies.tags.map((tag) => ({ id: `t:${tag.id}`, displayName: `tag:${tag.slug}` })),
	];

	$: filteredTaxonomies = taxonomies
		.filter((taxonomy) => !onlyBlacklisted || selectedTags.includes(taxonomy.id))
		.filter((taxonomy) => taxonomy.displayName.toLowerCase().includes(search.toLowerCase()));

	const toggle = (id: string) => {
		if (selectedTags.includes(id)) {
			selectedTags = selectedTags.filter((tagId) => tagId !== id);
		} else {
			selectedTags = [...selectedTags, id];
		}
	};

	onMount(() => {
		const { blacklist } = cookie.parse(document.cookie);

		if (blacklist) {
			selectedTags = blacklist.split(',');
		}

		isMouted = true;
	});

	$: {
		if (browser && isMouted) {
			document.cookie = cookie.serialize('blacklist', selectedTags.join(','), {
				path: '/',
				maxAge: 31536000,
			});
		}
	}
</script>

<main class="container relative space-y-4 lg:max-w-[1000px]">
	<h3 class="text-lg font-medium">Blacklist</h3>

	<div class="flex items-center">
		<Label class="w-full" for="preview-layout">Show only blacklisted</Label>
		<Checkbox bind:checked={onlyBlacklisted} id="preview-layout" />
	</div>

	<div class="overflow-clip rounded-md border border-border">
		<Input
			bind:value={search}
			class="rounded-none border-0 border-b border-b-border"
			placeholder="Search tag"
		/>

		<div class="max-h-[600px] overflow-auto">
			{#each filteredTaxonomies as taxonomy}
				<button
					class={cn(
						'block w-full bg-neutral-800 px-1 py-1.5 text-start text-sm font-medium odd:bg-neutral-900 hover:bg-neutral-700',
						selectedTags.includes(taxonomy.id) && '!bg-destructive/70 hover:!bg-destructive'
					)}
					on:click={() => toggle(taxonomy.id)}
				>
					{taxonomy.displayName}
				</button>
			{/each}
		</div>
	</div>
</main>
