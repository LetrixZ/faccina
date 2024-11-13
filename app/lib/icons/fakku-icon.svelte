<script lang="ts">
	interface Props {
		[key: string]: any;
	}

	let { ...rest }: Props = $props();
</script>

<svg
	class={rest.class || ''}
	fill="none"
	height="24"
	viewBox="0 0 293 271"
	width="24"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M0 10.6H161.37V60.44H65.34V100.92H146.045V147.76H65.34V242.52H0V10.6ZM139.61 249.7L167.38 259.1L201.03 270.5L219.12 220.86L157.78 199.74L139.61 249.7ZM292.5 19.34L231.04 -1.5L166.5 175.86L227.84 196.98L292.5 19.34Z"
		fill="white"
	/>
</svg>
