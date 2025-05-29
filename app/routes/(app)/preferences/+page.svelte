<script lang="ts">
	import { browser } from '$app/environment';
	import InputChip from '$lib/components/input-chip.svelte';
	import cookie from 'cookie';
	import { toast } from 'svelte-sonner';

	export let data;

	let isMouted = false;
	let selectedTags: string[] = [];

	$: {
		if (browser && isMouted) {
			document.cookie = cookie.serialize('blacklist', selectedTags.join(','), {
				path: '/',
				maxAge: 31536000,
			});
		}
	}

	let blacklist: string[] = [];

	$: {
		blacklist = data.blacklist;
	}

	const save = async () => {
		const formData = new FormData();
		formData.set('blacklist', JSON.stringify(blacklist));

		await fetch('?/saveBlacklist', {
			method: 'POST',
			body: formData,
		});

		toast.success('Blacklist updated successfully.');
	};
</script>

<main class="container relative max-w-screen-md space-y-4">
	<div class="space-y-1.5">
		<p class="font-semibold">Blacklist tags</p>
		<p class="text-sm font-medium">You can use the same tag syntax as the search.</p>

		<InputChip
			id="tags"
			chips={blacklist}
			tags={data.tags.map((tag) => `${tag.namespace}:${tag.name}`)}
			on:update={(ev) => {
				blacklist = ev.detail;
				save();
			}}
		/>
	</div>
</main>
