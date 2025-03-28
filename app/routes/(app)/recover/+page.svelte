<script lang="ts">
	import RecoverForm from '$lib/components/recover-form.svelte';

	const { data } = $props();
</script>

<main class="container mx-auto w-full md:w-96">
	<RecoverForm data={data.form} hasMailer={data.site.hasMailer} />
</main>
