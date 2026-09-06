<script lang="ts">
	import { cn } from "$lib/utils";

	let { name, src, url, class: className }: { name: string; src: string; url: string; class?: string } = $props();
</script>

<a href={url} target="_blank" rel="noopener noreferrer">
	<img {src} alt={name} title={name} decoding="async" class={cn("-my-0.5 inline-block max-h-6 align-text-bottom", className)} />
</a>
