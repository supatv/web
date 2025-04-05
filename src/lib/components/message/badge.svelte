<script>
	import Image from "../image.svelte";

	let { src, title = "", alt = "" } = $props();
</script>

<Image {src} {title} {alt} class="inline-block max-h-4 min-w-4" />
