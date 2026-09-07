<script lang="ts">
	import { ReplyIcon } from "@lucide/svelte";

	import { cn } from "$lib/utils";

	import type { Message } from "$lib/twitch/chat.svelte";

	let { msg, onclick, class: className }: { msg: Message; onclick: () => void; class?: string } = $props();

	const author = $derived(msg.tags["reply-parent-display-name"] || msg.tags["reply-parent-user-login"]);
	const body = $derived(msg.tags["reply-parent-msg-body"] ?? "");
</script>

<button
	type="button"
	{onclick}
	title="@{author}: {body}"
	class={cn("ring-focus text-dim/80 hover:text-accent flex min-w-0 items-center gap-x-0.5 rounded-sm text-left text-xs leading-5 transition-colors", className)}
>
	<ReplyIcon class="size-4 shrink-0 -scale-x-100" />
	<span class="min-w-0 truncate">Replying to @{author}: {body}</span>
</button>
