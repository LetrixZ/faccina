<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { appState } from '$lib/stores';

	type Props = {
		pageLimits: number[];
		value?: number;
		onChange?: (value: number) => boolean;
	};

	let { pageLimits, value, onChange }: Props = $props();

	const options = $derived(
		pageLimits.map((limit) => ({
			label: limit.toString(),
			value: limit.toString(),
		}))
	);

	const limit = $derived.by(() => {
		if (value) {
			return value;
		}

		const param = page.url.searchParams.get('limit');

		if (!param) {
			return appState.siteConfig.defaultPageLimit;
		}

		return parseInt(param) || pageLimits[0];
	});

	const limitOption = $derived(
		options.find((option) => +option.value === limit)?.value ?? options[0]?.value
	);

	const selectedLabel = $derived(
		value ? options.find((option) => +option.value === value)?.label : ''
	);

	const onValueChange = (value: string) => {
		if (onChange && !onChange(+value || pageLimits[0]!)) {
			return;
		}

		const query = new URLSearchParams(page.url.searchParams.toString());
		query.set('limit', value ?? pageLimits[0]!.toString());

		goto(`?${query.toString()}`);
	};
</script>

<div class="flex items-end justify-between gap-2">
	<div class="space-y-0.5 md:w-fit">
		<Label class="text-end">Per page</Label>
		<Select.Root items={options} {onValueChange} type="single" value={limitOption}>
			<Select.Trigger aria-label="Select page limit" class="w-20 text-muted-foreground-light">
				{selectedLabel}
			</Select.Trigger>
			<Select.Content preventScroll={false}>
				{#each options as option}
					<Select.Item value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
</div>
