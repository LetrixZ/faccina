<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { siteConfig } from '../stores';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';

	interface Props {
		pageLimits: number[];
		value?: number | undefined;
	}

	let { pageLimits, value = undefined }: Props = $props();

	const dispatch = createEventDispatcher<{ change: number }>();

	const options = pageLimits.map((limit) => ({
		label: limit.toString(),
		value: limit.toString(),
	}));

	let limit = $derived(
		(() => {
			if (value) {
				return value.toString();
			}

			const param = $page.url.searchParams.get('limit');

			if (!param) {
				return $siteConfig.defaultPageLimit.toString();
			}

			return parseInt(param).toString() || pageLimits[0].toString();
		})()
	);

	let limitOption = $derived(options.find((option) => option.value === limit) ?? options[0]);
</script>

<div class="flex items-end justify-between gap-2">
	<div class="space-y-0.5 md:w-fit">
		<Label class="text-end">Per page</Label>
		<Select.Root
			items={options}
			onValueChange={(value) => {
				if (!dispatch('change', parseInt(value) ?? pageLimits[0], { cancelable: true })) {
					return;
				}

				const query = new URLSearchParams($page.url.searchParams.toString());
				query.set('limit', value ?? pageLimits[0].toString());

				goto(`?${query.toString()}`);
			}}
			type="single"
			value={limitOption.value}
		>
			<Select.Trigger aria-label="Select page limit" class="w-20" />
			<Select.Content preventScroll={false}>
				{#each options as option}
					<Select.Item value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
</div>
