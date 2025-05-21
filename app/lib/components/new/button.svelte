<script lang="ts">
	import { cn } from '$lib/utils';
	import { tv, type VariantProps } from 'tailwind-variants';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	const button = tv({
		base: 'min-h-9 w-fit rounded-2xl border px-4 text-sm font-medium shadow',
		variants: {
			color: {
				neutral: 'border-button-border bg-button hover:bg-button-hover active:bg-button-activated',
				green:
					'active:bg-button-green-activated border-button-green-border bg-button-green hover:bg-button-green-hover',
				blue: 'active:bg-button-blue-activated border-button-blue-border bg-button-blue hover:bg-button-blue-hover',
			},
		},
		defaultVariants: {
			color: 'neutral',
		},
	});

	type ButtonVariants = VariantProps<typeof button>;
	type Props = ButtonVariants & HTMLButtonAttributes;

	const { children, color, class: className, ...restProps }: Props = $props();
</script>

<button {...restProps} class={cn(button({ color }), className)}>
	{@render children?.()}
</button>

<style>
	.btn-green {
		--color: var(--color-green-600);
	}

	/* button {
		--color: var(--color-muted);
		--mix-ratio: 85%;
		--border-mix-ratio: 80%;
		--background-color: color-mix(in srgb, var(--color-muted), var(--color));
		--border-color: color-mix(in srgb, var(--color-button), var(--color));

		background-color: --alpha(
			color-mix(in srgb, var(--app-color), var(--background-color) var(--mix-ratio)) / 50%
		);
		border-color: --alpha(
			color-mix(in srgb, var(--app-color), var(--border-color) var(--border-mix-ratio)) / 50%
		);

		&:hover {
			@media (hover: hover) {
				border-color: --alpha(
					color-mix(
							in srgb,
							var(--app-color),
							color-mix(in srgb, var(--color-button-highlight), var(--color)) 75%
						) /
						80%
				);
			}
		}

		&:active {
			background-color: --alpha(
				color-mix(in srgb, var(--app-color), var(--background-color) 75%) / 50%
			);
			border-color: --alpha(
				color-mix(
						in srgb,
						var(--app-color),
						color-mix(in srgb, var(--color-button-highlight), var(--color)) 75%
					) /
					80%
			);
		}
	}

	button.neutral {
		--color: var(--color-muted);
		--mix-ratio: 95%;
		--border-mix-ratio: 95%;
	}

	button.blue {
		--color: var(--color-blue-600);
	}

	button.green {
		--color: var(--color-green-600);
	}

	button.red {
		--color: var(--color-red-600);
	}

	button.transparent {
		--color: transparent;
		background-color: transparent;
	} */
</style>
