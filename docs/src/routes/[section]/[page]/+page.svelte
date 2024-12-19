<script lang="ts">
	const { data } = $props();
	const { Content } = $derived(data);
</script>

<div class="all-prose min-w-full">
	<Content />
</div>
