<script lang="ts">
	import { mode } from "mode-watcher";

	import type { ChatSource, Message } from "$lib/twitch/chat.svelte";

	import Badge from "./badge.svelte";

	let { chat, msg }: { chat: ChatSource; msg: Message } = $props();

	const isNotice = $derived(Boolean(msg.tags["target-user-id"]) || !msg.displayName);
	const nameColor = $derived(`hsl(from ${msg.tags["color"] || "gray"} h s ${mode.current === "light" ? "40%" : "70%"})`);

	// badge images arrive well after the line first paints, so until the tables land reserve
	// their width from the tag's own count (size-4 each, gap-0.5 between) to keep the message
	// from jumping; once they have, only the badges that resolved take space, so ones no loaded
	// set covers — channel badges on /firehose — leave nothing behind
	const taggedCount = $derived(msg.tags["badges"] ? msg.tags["badges"].split(",").length : 0);
	const badgeCount = $derived(chat.badgeVersion && chat.globalBadges.size ? chat.badges(msg).length : taggedCount);
</script>

{#if badgeCount}
	<!-- align-middle centres on the x-height; half the cap/x difference raises that to the cap-height centre, where the eye reads the line's middle -->
	<span class="relative top-[calc((1ex-1cap)/2)] mr-1 inline-flex shrink-0 items-center gap-x-0.5 align-middle select-none" style="min-width: {badgeCount * 18 - 2}px">
		{#key chat.badgeVersion}
			{#each chat.badges(msg) as badge (badge.id)}
				<Badge src={badge.src} title={badge.title} />
			{/each}
		{/key}
	</span>
{/if}{#if !isNotice}
	<span class="font-bold" style="color: {nameColor}">{msg.displayName}:</span>
{/if}

<span class={[isNotice && "text-dim"]}>
	{#key chat.emoteVersion}
		{#each chat.parse(msg) as { type: Component, props }, index (index)}
			<Component {...props} />
		{/each}
	{/key}
</span>
