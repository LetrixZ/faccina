<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = HTMLInputAttributes;

	let { value = $bindable(), children, ...restProps }: Props = $props();
</script>

<label class="flex flex-col gap-2">
	<span class="text-sm font-medium text-neutral-300">
		{@render children?.()}
	</span>
	<input class="min-h-9 rounded-3xl border px-3 text-sm outline-none" bind:value {...restProps} />
</label>

<style>
	input {
		--alpha: 80%;
		--mix-ratio: 80%;
		--background-color: var(--color-neutral-800);
		--border-color: var(--color-neutral-700);

		border-color: --alpha(
			color-mix(in oklab, var(--color-neutral-500) 80%, var(--color-accent)) / 40%
		);

		&:focus-visible {
			border-color: --alpha(
				color-mix(in oklab, var(--color-neutral-400) 80%, var(--color-accent)) / 60%
			);
		}
	}
</style>
