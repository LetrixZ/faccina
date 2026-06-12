<script lang="ts">
	import RecoverForm from '$lib/components/recover-form.svelte';

	let { data } = $props();
</script>

<main class="container mx-auto w-full md:w-96">
	<RecoverForm form={data.form} hasMailer={data.site.hasMailer} />
</main>
