<script lang="ts">
	import RegisterForm from '$lib/components/register-form.svelte';

	export let data;
</script>

<main class="container mx-auto w-full md:w-96">
	<RegisterForm data={data.form} hasMailer={data.site.hasMailer} />
</main>
