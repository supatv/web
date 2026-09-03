<script lang="ts">
	import type { SVGAttributes } from "svelte/elements";

	let { class: className, ...rest }: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class={className} aria-hidden="true" {...rest}>
	<path d="M9.2 7 7 2.9M14.8 7 17 2.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
	<circle cx="6.6" cy="2.3" r="1.4" fill="currentColor" />
	<circle cx="17.4" cy="2.3" r="1.4" fill="currentColor" />
	<rect x="2" y="6" width="20" height="16" rx="5.5" fill="currentColor" />
	<circle cx="6" cy="16.2" r="1.1" fill="var(--accent-ink)" opacity="0.28" />
	<circle cx="18" cy="16.2" r="1.1" fill="var(--accent-ink)" opacity="0.28" />
	<circle cx="8.8" cy="12.6" r="1.5" fill="var(--accent-ink)" />
	<circle cx="15.2" cy="12.6" r="1.5" fill="var(--accent-ink)" />
	<path d="M9 16.4q3 2.8 6 0" fill="none" stroke="var(--accent-ink)" stroke-width="2" stroke-linecap="round" />
</svg>
