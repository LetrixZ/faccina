<script lang="ts">
	import type { Task } from '$lib/models';
	import { cn } from '$lib/utils.js';
	import { Button } from './ui/button/index.js';
	import { Progress } from './ui/progress/index.js';
	import Save from '@lucide/svelte/icons/save';

	let {
		task,
		onSave
	}: {
		task: Task;
		onSave?: () => void;
	} = $props();
</script>

<div class="flex w-full flex-col space-y-1">
	<div class="flex items-center justify-between gap-2">
		<div>
			<p class="text-sm font-semibold">{task.gallery.title}</p>
			<p class="text-xs">Progress: {task.progress}/{task.total}</p>
		</div>

		<Button
			class={cn(
				'size-7 shrink-0 bg-transparent p-1 hover:bg-success/20 disabled:opacity-5',
				task.complete && 'text-success'
			)}
			disabled={!task.complete}
			onclick={() => onSave?.()}
		>
			<Save class="h-full w-full" />
		</Button>
	</div>

	<Progress class="h-px" value={(task.progress * 100) / task.total} />
</div>
