<script lang="ts">
	import RegisterForm from '$lib/components/register-form.svelte';

	let { data } = $props();
</script>

<main class="container mx-auto w-full md:w-96">
	<RegisterForm form={data.form} hasMailer={data.site.hasMailer} />
</main>
