<script lang="ts">
	import LoginForm from '~/lib/components/login-form.svelte';

	export let data;
</script>

<div class="mx-auto max-w-sm pt-4 md:pt-8">
	<LoginForm data={data.form} />
</div>
