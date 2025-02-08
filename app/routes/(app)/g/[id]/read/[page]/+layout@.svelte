<script lang="ts">
	import { readerStore } from './reader';
</script>

{#if $readerStore}
	<slot />
{/if}
