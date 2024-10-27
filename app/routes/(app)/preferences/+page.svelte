<script lang="ts">
	import { browser } from '$app/environment';
	import cookie from 'cookie';
	import { UploadCloud } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	import InputChip from '~/lib/components/input-chip.svelte';
	import { Button } from '~/lib/components/ui/button';

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

	let blacklist: string[] = data.blacklist;

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

<main class="container relative space-y-4">
	<div class="space-y-1.5">
		<p class="text-lg font-bold">Blacklist tags</p>
		<p>You can use the same tag syntax as the search.</p>

		<InputChip
			chips={blacklist}
			id="tags"
			on:update={(ev) => {
				blacklist = ev.detail;
				save();
			}}
			tags={data.tags.map((tag) => `${tag.namespace}:${tag.name}`)}
		/>

		{#if data.user}
			<Button class="flex w-full gap-2" variant="ghost">
				<UploadCloud class="size-[1.125rem]" /> Sync
			</Button>
		{/if}
	</div>
</main>
