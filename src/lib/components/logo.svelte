<script lang="ts">
	import type { SVGAttributes } from "svelte/elements";

	let { class: className, ...rest }: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class={className} aria-hidden="true" {...rest}>
	<rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
	<path d="M5 12h3l2.2-4.6L14 16.6l2-4.6h3" fill="none" stroke="var(--accent-ink)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />
</svg>
