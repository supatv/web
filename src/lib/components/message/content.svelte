<script lang="ts">
	import { mode } from "mode-watcher";

	import type { ChatSource, Message } from "$lib/twitch/chat.svelte";

	import Badge from "./badge.svelte";

	let { chat, msg }: { chat: ChatSource; msg: Message } = $props();

	const isNotice = $derived(Boolean(msg.tags["target-user-id"]) || !msg.displayName);
	const nameColor = $derived(`hsl(from ${msg.tags["color"] || "gray"} h s ${$mode === "light" ? "40%" : "70%"})`);
</script>

{#if msg.tags["badges"]}
	<span class="inline-flex gap-x-0.5 align-middle select-none empty:hidden">
		{#key chat.badgeVersion}
			{#each chat.badges(msg) as badge (badge.id)}
				<Badge src={badge.src} title={badge.title} />
			{/each}
		{/key}
	</span>
{/if}

{#if !isNotice}
	<span class="font-bold" style="color: {nameColor}">{msg.displayName}:</span>
{/if}

<span class={[isNotice && "text-neutral-500"]}>
	{#key chat.emoteVersion}
		{#each chat.parse(msg) as { type: Component, props }, index (index)}
			<Component {...props} />
		{/each}
	{/key}
</span>
