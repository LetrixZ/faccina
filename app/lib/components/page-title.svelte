<script>
	import { cn } from '$lib/utils';
</script>

<p class={cn('text-foreground flex min-h-8 items-center text-xl font-semibold', $$props.class)}>
	<slot />
</p>
