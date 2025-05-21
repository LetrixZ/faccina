<script lang="ts">
	import { cn } from '$lib/utils';
	import Save from '@lucide/svelte/icons/save';
	import Button from './ui/button/button.svelte';
	import Progress from './ui/progress/progress.svelte';
	import type { Task } from '$lib/models';

	type Props = {
		task: () => Task;
		save?: () => void;
	};

	let { task: getTask, save }: Props = $props();

	const task = $derived(getTask());
</script>

<div class="flex w-full flex-col space-y-1">
	<div class="flex items-center justify-between gap-2">
		<div>
			<p class="text-sm font-semibold">{task.gallery.title}</p>
			<p class="text-xs">Progress: {task.progress}/{task.total}</p>
		</div>

		<Button
			class={cn(
				'size-7 flex-shrink-0 bg-transparent p-1 hover:bg-success/20 disabled:opacity-5',
				task.complete && 'text-success'
			)}
			disabled={!task.complete}
			onclick={save}
		>
			<Save class="h-full w-full" />
		</Button>
	</div>

	<Progress class="h-px bg-green-700" value={(task.progress * 100) / task.total} />
</div>
