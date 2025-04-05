<script>
	let { src, title = "", alt = "" } = $props();
</script>

<div class="size-4">
	<img {src} {title} {alt} class="max-h-4 min-w-4" />
</div>
