<script lang="ts">
	import { mode } from "mode-watcher";
	import dayjs from "dayjs";
	import linkParser from "$lib/link-parser";

	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Button } from "$lib/components/ui/button/index.js";

	import * as Select from "$lib/components/ui/select/index.js";
	import * as Card from "$lib/components/ui/card/index.js";

	import FocusTrap from "$lib/components/focus-trap.svelte";

	import VirtualList from "svelte-tiny-virtual-list";

	import TextFragment from "$lib/components/message/text-fragment.svelte";
	import Emote from "$lib/components/message/emote.svelte";
	import Link from "$lib/components/message/link.svelte";
	import Badge from "$lib/components/message/badge.svelte";

	import { ChevronsDownIcon } from "@lucide/svelte";

	import { getContext, onDestroy, onMount, tick, untrack } from "svelte";
	import { SvelteMap } from "svelte/reactivity";

	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";

	import { timeFormat, type TitleContext } from "$lib/common";

	import type { EmoteProps, BadgeProps, Message, ChatComponents, TMIEmote } from "$lib/twitch/logs";
	import { messageSearch } from "$lib/twitch/logs";

	import * as TwitchServices from "$lib/twitch/services/index.js";

	import instances from "./instances.json";

	getContext<TitleContext>("title").set("Firehose");

	let logsBoxHeight = $state(0);

	let error: string | null = $state(null);
	// let loading = $state(false);

	let isPopoverOpen = $state(false);

	let messagesPerSecond = $state(0);

	let socket: WebSocket | null = $state(null);

	const destroySocket = () => {
		if (socket) {
			socket.close();
			socket = null;
		}
	};

	// let logsBox: HTMLDivElement | null = $state(null);
	let searchInput: HTMLInputElement | null = $state(null);

	// Emotes
	const globalEmotes = new SvelteMap<string, EmoteProps>();
	let emoteUpdates = $state(0);

	// Badges
	const globalBadges = new SvelteMap<string, BadgeProps>();
	let badgeUpdates = $state(0);

	let instanceValue = $state("");
	let searchValue = $state("");

	onMount(() => {
		fetchGlobalBadges();
		fetchGlobalEmotes();

		const q = page.url.searchParams;

		const instanceParam = q.get("i")?.toLowerCase();
		if (instanceParam && instanceParam in instances) {
			instanceValue = instanceParam;
		} else {
			instanceValue = "firehose.catquery.com";
		}

		searchValue = q.get("s") || "";
	});

	onDestroy(() => {
		destroySocket();
		if (chatRenderTimeout) clearTimeout(chatRenderTimeout);
	});

	$effect(() => {
		const i = instanceValue;
		const s = searchValue;
		untrack(() => {
			const q = page.url.searchParams;

			if (i) q.set("i", i);

			if (s) q.set("s", s);
			else q.delete("s");

			goto(page.url.search, { replaceState: true, keepFocus: true });
		});
	});

	const windowKeydown = (event: KeyboardEvent) => {
		if (event.ctrlKey && event.key === "f") {
			searchInput?.focus();
			event.preventDefault();
		}
	};

	let chatRenderTimeout: number | NodeJS.Timeout | null = null;

	let chatLogs: Message[] = $state([]);
	let chatBuffer: Message[] = [];

	let scrollPaused = $state(false);

	const renderChat = async () => {
		chatLogs = chatLogs.concat(chatBuffer).slice(!scrollPaused ? -10_000 : 0);
		chatBuffer = [];
		await tick();
		chatRenderTimeout = setTimeout(renderChat, 250);
	};
	if (browser) renderChat();

	$effect(() => {
		if (!instanceValue) return;
		untrack(() => {
			destroySocket();
			chatLogs = [];
			chatBuffer = [];
			scrollPaused = false;

			socket = new WebSocket(`wss://${instanceValue}/firehose?jsonBasic=true`);
			socket.addEventListener("message", (event) => {
				messagesPerSecond++;
				setTimeout(() => {
					messagesPerSecond--;
				}, 1000);

				chatBuffer.push(JSON.parse(event.data));
			});
		});
	});

	let filteredChatLogs = $derived(messageSearch(searchValue, chatLogs, null));

	const logsAfterScroll = ({ detail }: { detail: { event: Event; offset: number } }) => {
		const el = detail.event.target as HTMLDivElement;
		const remScroll = Math.abs(el.scrollHeight - el.clientHeight - detail.offset);
		scrollPaused = remScroll > 24;
	};

	const resumeScroll = () => {
		scrollPaused = false;
		const virtualList = document.querySelector(".virtual-list-wrapper");
		if (!virtualList) return;
		virtualList.scrollTop = virtualList.scrollHeight;
	};

	$effect(() => {
		if (!filteredChatLogs) return;
		untrack(() => {
			if (!scrollPaused) {
				resumeScroll();
			}
		});
	});

	const getBadges = (msg: Message) => {
		const badges: { id: string; src: string; title: string; alt: string }[] = [];

		const badgeList = msg.tags["badges"].split(",");
		for (const badge of badgeList) {
			const [id, version] = badge.split("/");
			const key = `${id}/${version}`;

			const globalBadge = globalBadges.get(key);
			if (globalBadge) {
				badges.push({
					id,
					src: globalBadge.url,
					title: globalBadge.title,
					alt: globalBadge.title,
				});
			}
		}

		return badges;
	};

	const fetchGlobalBadges = async () => {
		const globalBadgesList = await TwitchServices.IVR.getGlobalBadges();

		globalBadgesList.forEach((badge) => {
			badge.versions.forEach((version) => {
				globalBadges.set(`${badge.set_id}/${version.id}`, {
					url: version.image_url_1x,
					title: version.title,
				});
			});
		});

		badgeUpdates++;
	};

	const fetchGlobalEmotes = async () => {
		const [stvEmotes, bttvEmotes, ffzEmotes] = (
			await Promise.allSettled([TwitchServices.SevenTV.getGlobalEmotes(), TwitchServices.BetterTTV.getGlobalEmotes(), TwitchServices.FrankerFaceZ.getGlobalEmotes()])
		).map((p) => (p.status === "fulfilled" ? p.value : []));

		stvEmotes.forEach((emote) => {
			globalEmotes.set(emote.name!, {
				url: `https://7tv.app/emotes/${emote.id}`,
				src: `https://cdn.7tv.app/emote/${emote.id}/1x.webp`,
			});
		});

		bttvEmotes.forEach((emote) => {
			globalEmotes.set(emote.code!, {
				url: `https://betterttv.com/emotes/${emote.id}`,
				src: `https://cdn.betterttv.net/emote/${emote.id}/1x.webp`,
			});
		});

		ffzEmotes.forEach((emote) => {
			globalEmotes.set(emote.name!, {
				url: `https://www.frankerfacez.com/emoticon/${emote.id}-${emote.name}`,
				src: `https://cdn.frankerfacez.com/emote/${emote.id}/1`,
			});
		});

		emoteUpdates++;
	};

	const parseMessage = (msg: Message) => {
		let components: ChatComponents = [];

		let twitchEmotes: TMIEmote[] = [];
		const systemMsg = msg.tags["system-msg"];
		const posOffset = systemMsg ? [...systemMsg].length + 1 : 0;
		if (msg.tags["emotes"]) {
			for (const e of msg.tags["emotes"].split("/")) {
				const [id, positions] = e.split(":");
				for (const pos of positions.split(",")) {
					twitchEmotes.push({ id, pos: pos.split("-").map((s) => Number(s) + posOffset) });
				}
			}
			twitchEmotes = twitchEmotes.sort((a, b) => a.pos[0] - b.pos[0]);
		}

		let cum = "";
		const unicode = [...msg.text];
		for (let i = 0; i < unicode.length; i++) {
			const c = unicode[i];

			const nextEmote = twitchEmotes[0];
			if (nextEmote?.pos[0] === i) {
				twitchEmotes.shift();
				components.push({
					type: Emote,
					props: {
						name: unicode.slice(nextEmote.pos[0], nextEmote.pos[1] + 1).join(""),
						src: `https://static-cdn.jtvnw.net/emoticons/v2/${nextEmote.id}/default/dark/1.0`,
						url: `https://emotes.susgee.dev/emote/${nextEmote.id}`,
					},
				});
				i = nextEmote.pos[1];
				continue;
			}

			if (c === " ") {
				if (cum.trim()) {
					processWord(cum, components);
					cum = "";
				}
				components.push({ type: TextFragment, props: { text: " " } });
			} else {
				cum += c;
			}

			if (i === unicode.length - 1 && cum.trim()) {
				processWord(cum, components);
			}
		}

		return components;
	};

	const processWord = (word: string, components: ChatComponents) => {
		const emoteProps = globalEmotes.get(word);
		if (emoteProps) {
			components.push({ type: Emote, props: { name: word, ...emoteProps } });
			return;
		}

		const url = linkParser.parse(word);
		if (url) {
			components.push({
				type: Link,
				props: { href: `${url.protocol || "//"}${url.host}${url.rest}`, text: word },
			});
		} else {
			components.push({ type: TextFragment, props: { text: word } });
		}
	};
</script>

<svelte:head>
	<title>Twitch Firehose</title>
	<meta name="keywords" content="twitch, twitch firehose, twitch chat, twitch bots, twitch dev, live messages, chat logs, developers, api" />
	<meta name="description" content="View every Twitch chat message in real-time." />
</svelte:head>

<svelte:window on:keydown={windowKeydown} />

<div id="main-fit-screen" class="hidden"></div>

<div class="relative flex h-full min-h-0 flex-1 flex-col p-5">
	<h1 class="text-4xl font-bold">Twitch Firehose</h1>
	<p class="mb-2 text-xs font-light">
		Real-time stream of logged Twitch chats.
		<span class="font-normal tabular-nums">{messagesPerSecond}</span> messages per second...
	</p>

	{#if error}
		<p class="text-red-500">{error}</p>
	{:else}
		<div class="mb-1 flex flex-row gap-1">
			<div class="flex w-48 flex-col">
				<Label for="input-channel" class="text-base">Instance</Label>

				<Select.Root type="single" bind:open={isPopoverOpen} bind:value={instanceValue}>
					<Select.Trigger class="h-8">
						{instanceValue}
					</Select.Trigger>
					<Select.Content>
						{#each Object.entries(instances) as [instance, display] (instance)}
							<Select.Item value={instance}>{display}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="w-full self-end">
				<Input id="input-search" maxlength={500} placeholder="Search" class="h-8" bind:ref={searchInput} bind:value={searchValue} />
			</div>
		</div>

		<div class="flex min-h-0 w-full flex-1" bind:clientHeight={logsBoxHeight}>
			<Card.Root class="h-full w-full flex-col overflow-hidden leading-5">
				<VirtualList height={logsBoxHeight} itemCount={filteredChatLogs.length} itemSize={20} on:afterScroll={logsAfterScroll}>
					<div class="flex h-5 !w-auto min-w-full flex-row items-center gap-x-1 text-nowrap px-3" slot="item" let:index let:style {style}>
						{@const msg = filteredChatLogs[index]}
						<span class="inline-block min-w-48 max-w-48 overflow-hidden">
							<a href="https://www.twitch.tv/{msg.channel}" target="_blank" title={msg.channel} class="font-bold text-neutral-500">
								#{msg.channel}
							</a>
						</span>
						<span class="select-none text-xs tabular-nums text-neutral-500">{dayjs(msg.timestamp).format(timeFormat)}</span>
						{#if msg.tags["badges"]}
							<span class="inline-flex select-none gap-x-0.5 empty:hidden">
								{#key badgeUpdates}
									{#each getBadges(msg) as badge (badge.id)}
										<Badge src={badge.src} title={badge.title} alt="" />
									{/each}
								{/key}
							</span>
						{/if}
						<span class="h-5">
							<span class:hidden={msg.tags["target-user-id"]} style="color: hsl(from {msg.tags['color'] || 'gray'} h s {$mode === 'light' ? '40%' : '70%'})" class="font-bold">
								{msg.displayName}:
							</span>
							<span class={[msg.tags["target-user-id"] && "text-neutral-500"]}>
								{#key emoteUpdates}
									{#each parseMessage(msg) as { type: Component, props }, index (index)}
										<Component {...props} />
									{/each}
								{/key}
							</span>
						</span>
					</div>
				</VirtualList>
				{#if scrollPaused}
					<div class="pointer-events-none absolute bottom-14 left-0 right-0 flex h-8 items-center justify-center">
						<Button variant="secondary" class="pointer-events-auto px-8" onclick={resumeScroll}>
							<ChevronsDownIcon class="size-4" />
							More messages below
						</Button>
					</div>
				{/if}
			</Card.Root>
		</div>
	{/if}
</div>

{#if isPopoverOpen}
	<FocusTrap />
{/if}

<style>
	:global(.virtual-list-wrapper) {
		overflow: scroll !important;

		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}
</style>
