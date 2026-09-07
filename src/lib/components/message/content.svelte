<script lang="ts">
	import { mode } from "mode-watcher";

	import type { ChatSource, ChatUser, Message } from "$lib/twitch/chat.svelte";
	import { messageNotice, noticeStyle } from "$lib/twitch/notice";

	import Badge from "./badge.svelte";

	let { chat, msg, onuserclick }: { chat: ChatSource; msg: Message; onuserclick?: (user: ChatUser) => void } = $props();

	const notice = $derived(messageNotice(msg));
	// a mod action names the user it removed, and carries their id under `target-user-id`
	const userId = $derived(msg.tags["target-user-id"] || msg.tags["user-id"] || "");
	const tone = $derived(noticeStyle[notice?.tone ?? "dim"]);
	const nameColor = $derived(`hsl(from ${msg.tags["color"] || "gray"} h s ${mode.current === "light" ? "40%" : "70%"})`);

	const openCard = () => onuserclick?.({ id: userId, name: notice?.actor || msg.displayName, channel: msg.channel });

	// badge images arrive well after the line first paints, so until the tables land reserve
	// their width from the tag's own count (size-4 each, gap-0.5 between) to keep the message
	// from jumping; once they have, only the badges that resolved take space, so ones no loaded
	// set covers — channel badges on /firehose — leave nothing behind
	const taggedCount = $derived(msg.tags["badges"] ? msg.tags["badges"].split(",").length : 0);
	const badgeCount = $derived(chat.badgeVersion && chat.globalBadges.size ? chat.badges(msg).length : taggedCount);
</script>

<!-- the chatter's name, drawn the same whether it opens a notice's wording or their own line -->
{#snippet chatterName(text: string)}{#if onuserclick && userId}<button type="button" onclick={openCard} class="ring-focus rounded-sm font-bold hover:underline" style:color={nameColor}>{text}</button
		>{:else}<span class="font-bold" style:color={nameColor}>{text}</span>{/if}{/snippet}

{#if badgeCount}
	<!-- align-middle centres on the x-height; half the cap/x difference raises that to the cap-height centre, where the eye reads the line's middle -->
	<span class="relative top-[calc((1ex-1cap)/2)] mr-1 inline-flex shrink-0 items-center gap-x-0.5 align-middle select-none" style="min-width: {badgeCount * 18 - 2}px">
		{#key chat.badgeVersion}
			{#each chat.badges(msg) as badge (badge.id)}
				<Badge src={badge.src} title={badge.title} />
			{/each}
		{/key}
	</span>
{/if}{#if notice}
	{@const Icon = notice.icon}
	<!-- inline rather than a flex row so a long system message wraps with the rest of the line -->
	<span class={tone.text}>
		<Icon
			class="relative top-[calc((1ex-1cap)/2)] mr-1 inline-block size-4 align-middle"
			{...notice.title ? { "aria-hidden": "true" } : { "aria-label": notice.label }}
		/>{#if notice.title}{@const name = notice.actor && notice.title.startsWith(notice.actor) ? notice.actor : ""}<span class="mr-1"
				>{#if name}{@render chatterName(name)}{/if}{notice.title.slice(name.length)}</span
			>{/if}{#each notice.chips as chip (chip.text)}{#if chip.href}<a
					href={chip.href}
					target="_blank"
					rel="noopener noreferrer"
					data-umami-event={chip.event}
					class={["relative top-[calc((1ex-1cap)/2)] mr-1 inline-block rounded-sm border px-1 align-middle text-xs whitespace-nowrap hover:underline", tone.chip]}>{chip.text}</a
				>{:else}<span class={["relative top-[calc((1ex-1cap)/2)] mr-1 inline-block rounded-sm border px-1 align-middle text-xs whitespace-nowrap", tone.chip]}>{chip.text}</span>{/if}{/each}
	</span>
{/if}{#if !notice || notice.author}
	{@render chatterName(msg.displayName)}<span class="font-bold" style:color={nameColor}>:</span>
{/if}
{#if !notice || notice.body}
	<span>
		{#key chat.emoteVersion}
			{#each chat.parse(msg) as { type: Component, props }, index (index)}
				<Component {...props} />
			{/each}
		{/key}
	</span>
{/if}
