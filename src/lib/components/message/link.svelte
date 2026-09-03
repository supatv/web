<script lang="ts">
	let { text, href }: { text: string; href: string } = $props();
</script>

<a {href} target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">{text}</a>
