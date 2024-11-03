<script lang="ts">
	import RecoverForm from '$lib/components/recover-form.svelte';

	export let data;
</script>

<div class="mx-auto max-w-sm pt-4 md:pt-8">
	<RecoverForm data={data.form} hasMailer={data.site.hasMailer} />
</div>
