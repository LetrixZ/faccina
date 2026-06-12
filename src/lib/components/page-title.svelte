<script>
	import { cn } from '$lib/utils';
</script>

<p class={cn('flex min-h-8 items-center text-xl font-semibold text-foreground', $$props.class)}>
	<slot />
</p>
