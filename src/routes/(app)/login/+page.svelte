<script lang="ts">
	import LoginForm from '$lib/components/login-form.svelte';

	export let data;
</script>

<main class="container mx-auto w-full md:w-96">
	<LoginForm data={data.form} hasMailer={data.site.hasMailer} />
</main>
