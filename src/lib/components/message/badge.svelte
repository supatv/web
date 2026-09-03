<script lang="ts">
	let { src, title = "" }: { src: string; title?: string } = $props();
</script>

<img {src} {title} alt="" class="inline-block size-[18px] align-middle" />
