<script lang="ts">
	import RecoverForm from '$lib/components/recover-form.svelte';

	export let data;
</script>

<main class="container mx-auto w-full md:w-96">
	<RecoverForm data={data.form} hasMailer={data.site.hasMailer} />
</main>
