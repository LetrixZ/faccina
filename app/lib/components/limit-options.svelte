<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { siteConfig } from '../stores';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';

	export let pageLimits: number[];
	export let value: number | undefined = undefined;

	const dispatch = createEventDispatcher<{ change: number }>();

	const options: { label: string; value: number }[] = pageLimits.map((limit) => ({
		label: limit.toString(),
		value: limit,
	}));

	$: limit = (() => {
		if (value) {
			return value;
		}

		const param = $page.url.searchParams.get('limit');

		if (!param) {
			return $siteConfig.defaultPageLimit;
		}

		return parseInt(param) || pageLimits[0];
	})();

	$: limitOption = options.find((option) => option.value === limit) ?? options[0];
</script>

<div class="flex items-end justify-between gap-2">
	<div class="space-y-0.5 md:w-fit">
		<Label class="text-end">Per page</Label>
		<Select.Root
			items={options}
			onSelectedChange={(option) => {
				if (!dispatch('change', option?.value ?? pageLimits[0], { cancelable: true })) {
					return;
				}

				const query = new URLSearchParams($page.url.searchParams.toString());
				query.set('limit', option?.value.toString() ?? pageLimits[0].toString());

				goto(`?${query.toString()}`);
			}}
			preventScroll={false}
			selected={limitOption}
		>
			<Select.Trigger aria-label="Select page limit" class="w-20">
				<Select.Value class="text-muted-foreground-light" />
			</Select.Trigger>
			<Select.Content>
				{#each options as option}
					<Select.Item value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
</div>
