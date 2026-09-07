<script lang="ts">
	import dayjs from "dayjs";

	import { Dialog } from "$lib/components/ui";

	import { timeFormat } from "$lib/common";
	import type { ChatSource, Message } from "$lib/twitch/chat.svelte";

	import MessageContent from "./content.svelte";

	let { chat, messages, msg = $bindable() }: { chat: ChatSource; messages: Message[]; msg: Message | null } = $props();

	// the thread tag only arrived in 2021, so a reply older than that names its parent and nothing
	// else: match either tag, and keep the message that was clicked even if neither turns it up
	const root = $derived(msg ? msg.tags["reply-thread-parent-msg-id"] || msg.tags["reply-parent-msg-id"] : "");

	const thread = $derived.by(() => {
		if (!msg) return [];
		const found = messages.filter((m) => m.id === root || m.tags["reply-thread-parent-msg-id"] === root || m.tags["reply-parent-msg-id"] === root);
		return found.includes(msg) ? found : [...found, msg];
	});

	const rootLoaded = $derived(thread.some((m) => m.id === root));
</script>

<Dialog
	bind:open={() => msg !== null, (open) => !open && (msg = null)}
	title="Reply thread"
	description="{thread.length.toLocaleString()} {thread.length === 1 ? 'message' : 'messages'}"
	class="max-w-2xl"
>
	<div class="flex max-h-[60svh] flex-col overflow-y-auto overscroll-contain text-sm leading-5">
		{#if !rootLoaded}
			<p class="text-dim mb-1 text-xs">The message this thread started from is not in the loaded logs.</p>
		{/if}
		{#each thread as message (message.id || message.timestamp)}
			<div class={["flex items-start gap-x-1 rounded-sm px-1 py-0.5", message === msg && "bg-accent/25"]}>
				<span class="text-dim/80 text-xs leading-5 tabular-nums select-none">{dayjs(message.timestamp).format(timeFormat)}</span>
				<span class="min-w-0 wrap-break-word">
					<MessageContent {chat} msg={message} />
				</span>
			</div>
		{/each}
	</div>
</Dialog>
