<!-- Button.svelte -->
<script lang="ts">
	let { class: className } = $props();
</script>

<button class={['my-btn', className]}> Test </button>

<style>
	@layer base {
		.my-btn {
			color: yellow;
		}
	}
</style>
