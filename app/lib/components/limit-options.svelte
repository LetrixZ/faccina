<script lang="ts">
	type Props = {
		value: number;
		pageLimits: number[];
		onChange?: (value: number) => boolean | unknown;
	};

	let { value = $bindable(), pageLimits, onChange }: Props = $props();

	console.log({ value });
</script>

<fieldset class="fieldset">
	<legend class="fieldset-legend">Per page</legend>
	<select
		class="select w-20"
		onchange={(ev) => onChange?.(+ev.currentTarget.value) === false && ev.preventDefault()}
		bind:value
	>
		{#each pageLimits as limit, index (index)}
			<option selected={limit === value}>{limit}</option>
		{/each}
	</select>
</fieldset>
