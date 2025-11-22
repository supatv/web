<script>
	let { text, replyUser, replyBody } = $props();
</script>

<span class="cursor-help underline decoration-dotted" title="{replyUser}: {replyBody}">{text}</span>
