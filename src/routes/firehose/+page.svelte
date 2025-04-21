<script lang="ts">
	import { mode } from "mode-watcher";
	import fuzzysort from "fuzzysort";
	import dayjs from "dayjs";
	import linkParser from "$lib/linkParser";

	import { Input } from "$lib/components/ui/input/index.js";

	import * as Card from "$lib/components/ui/card/index.js";

	import TextFragment from "$lib/components/message/text-fragment.svelte";
	import Emote from "$lib/components/message/emote.svelte";
	import Link from "$lib/components/message/link.svelte";
	import Badge from "$lib/components/message/badge.svelte";

	import { getContext, onDestroy, onMount, tick, untrack, type Component } from "svelte";

	import { dateTimeFormat, type TitleContext } from "$lib/common";

	import * as TwitchServices from "$lib/twitch/services/index.js";

	type Message = {
		text: string;
		displayName: string;
		channel?: string;
		timestamp: string;
		id: string;
		tags: {
			[key: string]: string;
		};
	};

	type TMIEmote = {
		id: string;
		pos: number[];
	};

	type ChatComponents = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		type: Component<any>;
		props: object;
	}[];

	type EmoteProps = {
		url: string;
		src: string;
	};

	getContext<TitleContext>("title").set("Firehose");

	let error: string | null = $state(null);
	let loading = $state(false);

	let messagesPerSecond = $state(0);
	let messagesCounter = 0;
	let messageId = 0;

	let secInterval: number | NodeJS.Timeout | null = null;

	let socket: WebSocket | null = $state(null);

	onMount(() => {
		secInterval = setInterval(() => {
			messagesPerSecond = messagesCounter;
			messagesCounter = 0;
		}, 1000);

		socket = new WebSocket("wss://logs.spanix.team/firehose?jsonBasic=true");
		socket.addEventListener("message", async (event) => {
			messagesCounter++;
			chatLogs.push([messageId++, JSON.parse(event.data)]);
			if (chatLogs.length > 100) {
				chatLogs.shift();
			}

			await tick();
			logsBox?.scrollTo(0, logsBox.scrollHeight);
		});

		fetchGlobalBadges();
		fetchGlobalEmotes();
	});

	onDestroy(() => {
		if (secInterval) {
			clearTimeout(secInterval);
			secInterval = null;
		}

		if (socket) {
			socket.close();
			socket = null;
		}
	});

	let logsBox: HTMLDivElement | null = $state(null);
	let searchInput: HTMLInputElement | null = $state(null);

	// Emotes
	const globalEmotes = new Map<string, EmoteProps>();
	let emoteUpdates = $state(0);

	// Badges
	const globalBadges = new Map();
	let badgeUpdates = $state(0);

	// const windowKeydown = (event: KeyboardEvent) => {
	// 	if (event.ctrlKey && event.key === "f") {
	// 		searchInput?.focus();
	// 		event.preventDefault();
	// 	}
	// };

	let chatLogs: Array<[number, Message]> = $state([]);

	let searchValue = $state("");

	// let filteredChatLogs = $derived.by(() => {
	// 	let logs = searchValue
	// 		? fuzzysort
	// 				.go(searchValue, chatLogs, { key: "text", threshold: 0.5, limit: 5000 })
	// 				.map((x) => x.obj)
	// 				.sort((a, b) => Date.parse(a[1].timestamp) - Date.parse(b[1].timestamp))
	// 		: chatLogs;
	// 	return logs;
	// });

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
						url: `https://emotes.awoo.nl/twitch/emote/${nextEmote.id}`,
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
	<title>Twitch Chat Firehose</title>
	<meta name="description" content="View every Twitch chat message in real-time." />
</svelte:head>

<!-- <svelte:window on:keydown={windowKeydown} /> -->

<div id="main-fit-screen" class="hidden"></div>

<div class="relative flex h-full min-h-0 flex-1 flex-col p-5">
	<div class="mb-4">
		<h1 class="text-2xl font-bold">Twitch Chat Firehose</h1>
		<p class="text-xs text-gray-500">Real-time stream of logged Twitch chats. {messagesPerSecond} messages per second...</p>
	</div>

	{#if error}
		<p class="text-red-500">{error}</p>
	{:else}
		<!-- <div class="mb-1 flex flex-row gap-1">
			<Input id="input-search" maxlength={500} placeholder="Search" class="h-8" bind:ref={searchInput} bind:value={searchValue} />
		</div> -->

		<div class="flex min-h-0 flex-1 overflow-hidden">
			<Card.Root class="flex-1 flex-col overflow-auto leading-none" bind:ref={logsBox}>
				<div class="max-h-full max-w-0 p-3">
					{#each chatLogs as [id, msg] (id)}
						<div class="flex h-5 flex-row gap-x-1 text-nowrap">
							<div class="inline min-w-72 max-w-72 overflow-hidden">
								<span class="text-xs tabular-nums text-neutral-500">{dayjs(msg.timestamp).format(dateTimeFormat)}</span>
								<a href="https://www.twitch.tv/{msg.channel}" target="_blank" class="font-bold text-neutral-500" title={msg.channel}>
									#{msg.channel}
								</a>
							</div>
							{#if msg.tags["badges"]}
								<div class="flex gap-x-0.5">
									{#key badgeUpdates}
										{#each getBadges(msg) as badge (badge.id)}
											<Badge src={badge.src} title={badge.title} alt="" />
										{/each}
									{/key}
								</div>
							{/if}
							<span class:hidden={msg.tags["target-user-id"]} style="color: hsl(from {msg.tags['color'] || 'gray'} h s {$mode === 'light' ? '40%' : '70%'})" class="font-bold">
								{msg.displayName}:
							</span>
							<span class:text-neutral-500={msg.tags["target-user-id"]}>
								{#key emoteUpdates}
									{#each parseMessage(msg) as { type: Component, props }, index (index)}
										<Component {...props} />
									{/each}
								{/key}
							</span>
						</div>
					{/each}
				</div>
			</Card.Root>
		</div>
	{/if}
</div>

<style>
	:global(.virtual-list-wrapper) {
		&::-webkit-scrollbar {
			@apply size-1.5 bg-sidebar-border;
		}
		&::-webkit-scrollbar-thumb {
			@apply rounded bg-foreground/50;
		}
	}
</style>

