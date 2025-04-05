<script>
	import Image from "../image.svelte";

	let { src, title = "", alt = "" } = $props();
</script>

<Image {src} {title} {alt} class="mr-0.5 inline-block min-w-4 max-h-4" />
