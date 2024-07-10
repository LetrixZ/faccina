<script lang="ts">
	import { TagType } from '$lib/models';
	import { Input } from '$ui/input';
	import { cn } from '$lib/utils';

	export let value: string[] = [];
	export let id: string | undefined = undefined;
	export let type: TagType;

	let input = '';

	const classes = (() => {
		switch (type) {
			case TagType.ARTIST:
				return 'bg-red-700 hover:bg-red-700/80';
			case TagType.CIRCLE:
				return 'bg-orange-700 hover:bg-orange-700/80';
			case TagType.MAGAZINE:
				return 'bg-blue-700 hover:bg-blue-700/80';
			case TagType.EVENT:
				return 'bg-rose-700 hover:bg-blue-700/80';
			case TagType.PUBLISHER:
				return 'bg-sky-700 hover:bg-sky-700/80';
			case TagType.PARODY:
				return 'bg-indigo-700 hover:bg-indigo-700/80';
			case TagType.TAG:
				return 'bg-neutral-700 hover:bg-neutral-700/80';
		}
	})();

	const addChip = () => {
		let newValue = input.trim();

		if (value.some((chip) => chip === newValue) || !newValue.length) {
			return;
		}

		value = [...value, input];
		input = '';
	};
</script>

<div
	class="rounded-md border border-border ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
>
	<form on:submit|preventDefault={addChip}>
		<Input {id} bind:value={input} class="border-none !ring-0 !ring-offset-0" />
	</form>

	{#if value.length}
		<div class="flex flex-wrap gap-2 px-2 pb-2">
			{#each value as chip}
				<button
					on:click={() => (value = value.filter((str) => str !== chip))}
					class={cn('rounded-md bg-secondary px-2 py-1 text-sm font-semibold', classes)}
					>{chip}</button
				>
			{/each}
		</div>
	{/if}
</div>
