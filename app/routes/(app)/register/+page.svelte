<script lang="ts">
	import RegisterForm from '$lib/components/register-form.svelte';

	export let data;
</script>

<div class="mx-auto max-w-sm pt-4 md:pt-8">
	<RegisterForm data={data.form} hasMailer={data.site.hasMailer} />
</div>
