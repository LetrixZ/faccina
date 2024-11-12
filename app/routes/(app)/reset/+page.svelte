<script lang="ts">
	import { goto } from '$app/navigation';
	import ResetForm from '$lib/components/reset-form.svelte';

	export let data;
</script>

<main class="container mx-auto w-full md:w-96">
	<ResetForm
		data={data.resetForm}
		on:result={({ detail: result }) => {
			if (result.type === 'success') {
				goto('/login');
			}
		}}
	/>
</main>
