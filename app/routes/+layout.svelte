<script>
	import { navigating } from '$app/stores';
	import { Toaster } from '$lib/components/ui/sonner';
	import { siteConfig, user } from '$lib/stores';
	import '../app.pcss';

	export let data;

	$: {
		if ($navigating) {
			fetch('/stats', {
				method: 'POST',
				body: JSON.stringify($navigating),
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}
	}

	$: {
		$siteConfig = data.site;
	}

	$: {
		$user = data.user;
	}
</script>

<Toaster position="bottom-center" richColors />

<slot></slot>
