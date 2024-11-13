<script lang="ts">
	import { cn } from '$lib/utils';
	interface Props {
		children?: import('svelte').Snippet;
		[key: string]: any
	}

	let { ...props }: Props = $props();
</script>

<p class={cn('text-xl font-semibold text-foreground', props.class)}>{@render props.children?.()}</p>
