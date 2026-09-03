<script lang="ts">
	let { text, replyUser, replyBody }: { text: string; replyUser: string; replyBody: string } = $props();
</script>

<span class="cursor-help underline decoration-dotted" title="{replyUser}: {replyBody}">{text}</span>
