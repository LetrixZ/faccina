<script lang="ts">
	import { goto } from '$app/navigation';
	import ResetForm from '$lib/components/reset-form.svelte';

	export let data;
</script>

<div class="mx-auto max-w-sm pt-4 md:pt-8">
	<ResetForm
		data={data.resetForm}
		on:result={({ detail: result }) => {
			if (result.type === 'success') {
				goto('/login');
			}
		}}
	/>
</div>
