<script lang="ts">
	let { text, href }: { text: string; href: string } = $props();
</script>

<a {href} target="_blank" rel="noopener noreferrer" class="dark:text-primary text-blue-600 hover:underline">{text}</a>
