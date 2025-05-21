<script>
	import { Separator } from 'bits-ui';
</script>

<Separator.Root>
	{#snippet child({ props })}
		<div class="separator h-px w-full" {...props}></div>
	{/snippet}
</Separator.Root>

<style>
	.separator {
		--alpha: 40%;
		--mix-ratio: 80%;
		--background-color: var(--color-neutral-800);
		--border-color: var(--color-neutral-700);

		background-color: --alpha(
			color-mix(in oklab, var(--background-color) var(--mix-ratio), var(--color-accent)) /
				var(--alpha)
		);
	}
</style>
