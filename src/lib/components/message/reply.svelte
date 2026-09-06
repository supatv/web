<script lang="ts">
	import { ReplyIcon } from "@lucide/svelte";

	import { cn } from "$lib/utils";

	import type { Message } from "$lib/twitch/chat.svelte";

	let { msg, class: className }: { msg: Message; class?: string } = $props();

	const author = $derived(msg.tags["reply-parent-display-name"] || msg.tags["reply-parent-user-login"]);
	const body = $derived(msg.tags["reply-parent-msg-body"] ?? "");
</script>

<div class={cn("text-dim/80 flex min-w-0 items-center gap-x-0.5 text-xs leading-5", className)} title="@{author}: {body}">
	<ReplyIcon class="size-4 shrink-0 -scale-x-100" />
	<span class="min-w-0 truncate">Replying to @{author}: {body}</span>
</div>
