<script lang="ts">
	import { cn, flyAndScale } from '$lib/utils';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { Select, type WithoutChildren } from 'bits-ui';
	import type { ClassValue } from 'svelte/elements';

	type Props = WithoutChildren<Select.RootProps> & {
		placeholder?: string;
		items: { value: string; label: string; disabled?: boolean }[];
		contentProps?: WithoutChildren<Select.ContentProps>;
		triggerClass?: ClassValue;
	};

	let {
		value = $bindable(),
		items,
		contentProps,
		placeholder,
		triggerClass,
		...restProps
	}: Props = $props();

	const selectedLabel = $derived(items.find((item) => item.value === value)?.label);
</script>

<Select.Root bind:value={value as never} {...restProps}>
	<Select.Trigger>
		{#snippet child({ props })}
			<button
				class={cn(
					'trigger relative flex items-center justify-between gap-4 rounded-2xl border px-2 py-1 text-sm font-medium',
					triggerClass
				)}
				{...props}
			>
				{selectedLabel ? selectedLabel : placeholder}
				<ChevronDown class="size-4" />
			</button>
		{/snippet}
	</Select.Trigger>
	<Select.Portal>
		<Select.Content forceMount sideOffset={4}>
			{#snippet child({ wrapperProps, props, open })}
				{#if open}
					<div {...wrapperProps}>
						<div
							{...props}
							class={cn(
								'content w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] rounded-lg p-1 shadow-md backdrop-blur-md',
								contentProps?.class
							)}
							transition:flyAndScale
						>
							{#each items as item, i (i + item.value)}
								<Select.Item disabled={item.disabled} label={item.label} value={item.value}>
									{#snippet child({ selected, highlighted, props })}
										<div
											{...props}
											class="flex min-h-6.5 cursor-pointer items-center gap-4 rounded-lg px-1.5 text-sm font-medium"
											class:highlighted
										>
											{item.label}
											{#if selected}
												<div class="ml-auto">
													<Check class="size-4.5" />
												</div>
											{/if}
										</div>
									{/snippet}
								</Select.Item>
							{/each}
						</div>
					</div>
				{/if}
			{/snippet}
		</Select.Content>
	</Select.Portal>
</Select.Root>

<style>
	@layer base {
		button.trigger {
			--alpha: 40%;
			--mix-ratio: 80%;
			--background-color: var(--color-neutral-800);
			--border-color: var(--color-neutral-700);

			transition:
				background-color 100ms ease,
				border-color 100ms ease,
				scale 75ms;

			@media (prefers-reduced-motion: reduce) {
				transition: none;
			}

			background-color: --alpha(
				color-mix(in oklab, var(--background-color) var(--mix-ratio), var(--color-accent)) /
					var(--alpha)
			);
			border-color: --alpha(
				color-mix(in oklab, var(--border-color) var(--mix-ratio), var(--color-accent)) /
					var(--alpha)
			);

			&:hover {
				@media (hover: hover) {
					--alpha: 60%;
				}
			}
		}
	}

	.content {
		background-color: color-mix(in oklab, var(--color-neutral-800) 80%, var(--color-accent));
	}

	.highlighted {
		background-color: color-mix(in oklab, var(--color-neutral-600) 80%, var(--color-accent));
	}
</style>
