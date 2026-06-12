<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';

	let {
		value = undefined,
		pageLimits,
		defaultPageLimit,
		onChange
	}: {
		value?: number;
		pageLimits: number[];
		defaultPageLimit: number;
		onChange?: (value: number) => boolean;
	} = $props();

	const options = $derived(
		pageLimits?.map((limit) => ({
			label: limit.toString(),
			value: limit
		})) ?? []
	);

	const limit = $derived.by(() => {
		if (value) {
			return value;
		}

		const param = page.url.searchParams.get('limit');
		if (!param) {
			return defaultPageLimit;
		}

		return parseInt(param) || pageLimits[0];
	});

	const onSelectedChange = (value: string | undefined) => {
		const result = onChange?.(Number(value ?? pageLimits[0]!));
		if (result) {
			return;
		}

		const query = new URLSearchParams(page.url.searchParams.toString());
		query.set('limit', (value ?? pageLimits[0]).toString());

		goto(`?${query.toString()}`);
	};

	const triggerContent = $derived(
		options.find((option) => option.value === limit)?.label ?? 'Select page limit'
	);
</script>

<div class="flex items-end justify-between gap-2">
	<div class="space-y-2 md:w-fit">
		<Label class="text-end">Per page</Label>
		<Select.Root onValueChange={onSelectedChange} type="single" value={limit?.toString()}>
			<Select.Trigger aria-label="Select page limit" class="w-20">
				{triggerContent}
			</Select.Trigger>
			<Select.Content align="start" preventScroll={false}>
				{#each options as option (option.value)}
					<Select.Item label={option.label} value={option.value.toString()}>
						{option.label}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
</div>
