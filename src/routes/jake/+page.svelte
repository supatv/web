<script lang="ts">
	import { mode } from "mode-watcher";

	import { Skeleton } from "$lib/components/ui/skeleton/index.js";

	import { dateTimeFormat, formatDuration, humanFileSize, type TitleContext } from "$lib/common";
	import linkParser from "$lib/link-parser";

	import { getContext, onDestroy, onMount, tick, untrack } from "svelte";
	import { SvelteMap } from "svelte/reactivity";

	import Image from "$lib/components/image.svelte";
	import dayjs from "dayjs";

	import TextFragment from "$lib/components/message/text-fragment.svelte";
	import Emote from "$lib/components/message/emote.svelte";
	import Link from "$lib/components/message/link.svelte";
	import Badge from "$lib/components/message/badge.svelte";

	import VirtualList from "svelte-tiny-virtual-list";
	import type { EmoteProps, BadgeProps, Message, ChatComponents, TMIEmote } from "$lib/twitch/logs";

	import * as TwitchServices from "$lib/twitch/services/index.js";

	getContext<TitleContext>("title").set("The Jake Files");

	const channelId = "94682428";

	let listHeight = $state(0);
	let chatList: HTMLDivElement | null = $state(null);
	let itemSize = 96;

	let selectedFile: number | null = $state(null);

	let currentVideoTime = $state(0);

	let chatLogs: Message[] | null = $state(null);
	let chatBuffer: Message[] = $state([]);

	let chatError = $state("");

	const channelEmotes = new SvelteMap<string, EmoteProps>();
	const globalEmotes = new SvelteMap<string, EmoteProps>();
	let emoteUpdates = $state(0);

	const channelBadges = new SvelteMap<string, BadgeProps>();
	const globalBadges = new SvelteMap<string, BadgeProps>();
	let badgeUpdates = $state(0);

	let files:
		| {
				id: string;
				duration: number;
				size: number;
				created_at: number;
				title: string;
		  }[]
		| null = $state(null);

	const fetchFiles = async () => {
		const res = await fetch("https://fi.supa.sh/.archive/jake/files.json");
		files = await res.json();
	};

	const openFile = async (index: number) => {
		selectedFile = index;
		currentVideoTime = 0;

		await tick();
		const virtualList = document.querySelector(".virtual-list-wrapper");
		if (!virtualList) return;
		virtualList.scrollTop = index * itemSize - virtualList.clientHeight / 2 + itemSize / 2;
	};

	let logsController: AbortController | null = null;
	$effect(() => {
		if (selectedFile === null) return;
		chatLogs = null;
		chatBuffer = [];

		const file = files?.[selectedFile];
		if (!file) return;

		untrack(async () => {
			logsController?.abort();
			logsController = new AbortController();

			const res = await fetch(
				`https://logs.supa.codes/channelid/${channelId}?jsonBasic=1&from=${new Date((file.created_at - file.duration - 300) * 1000).toISOString()}&to=${new Date(file.created_at * 1000).toISOString()}`,
				{ signal: logsController.signal }
			);
			if (!res.ok) {
				if (res.status === 404) chatLogs = [];
				else chatError = `Error from server: ${res.status} ${res.statusText}`;
				return;
			}

			const data: { messages: Message[] } = await res.json();
			chatLogs = data.messages;
		});
	});

	$effect(() => {
		if (selectedFile === null) return;
		untrack(() => {
			document.querySelector(".active-card")?.classList.remove("active-card");
			const fileCard = document.getElementById(`file-card-${selectedFile}`);
			if (!fileCard) return;
			fileCard.scrollIntoView({ behavior: "smooth", block: "center" });
			fileCard.classList.add("active-card");
		});
	});

	const windowKeydown = (event: KeyboardEvent) => {
		if (selectedFile === null || !files) return;

		if (event.key === "Escape") {
			selectedFile = null;
			event.preventDefault();
		} else if (event.key === "ArrowUp") {
			if (selectedFile > 0) openFile(selectedFile - 1);
			event.preventDefault();
		} else if (event.key === "ArrowDown") {
			if (selectedFile < files.length - 1) openFile(selectedFile + 1);
			event.preventDefault();
		}
	};

	const isNewMessageDivider = (msg: Message, index: number) => {
		const file = files?.[selectedFile || -1];
		if (!file) return false;

		const clipStart = file.created_at - file.duration;
		const msgSec = new Date(msg.timestamp).getTime() / 1000;
		const prevSec = index > 0 ? new Date(chatBuffer[index - 1].timestamp).getTime() / 1000 : -Infinity;

		return msgSec > clipStart && prevSec <= clipStart;
	};

	onMount(() => {
		fetchFiles();
		fetchGlobalBadges();
		fetchChannelBadges();
		fetchGlobalEmotes();
		fetchChannelEmotes();
	});

	let chatRenderInterval: NodeJS.Timeout | null = setInterval(async () => {
		if (!selectedFile) return;
		const file = files?.[selectedFile];
		if (!file) return;

		chatBuffer = chatLogs?.filter((msg) => new Date(msg.timestamp).getTime() <= currentVideoTime * 1000 + (file.created_at - file.duration) * 1000) ?? [];

		if (chatList) {
			const atBottom = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 50;
			if (atBottom) {
				await tick();
				chatList.scrollTop = chatList.scrollHeight;
			}
		}
	}, 250);

	onDestroy(() => {
		if (chatRenderInterval) clearInterval(chatRenderInterval);
	});

	const getBadges = (msg: Message) => {
		const badges: { id: string; src: string; title: string; alt: string }[] = [];

		const badgeList = msg.tags["badges"].split(",");
		for (const badge of badgeList) {
			const [id, version] = badge.split("/");
			const key = `${id}/${version}`;

			const badgeData = channelBadges.get(key) || globalBadges.get(key);
			if (badgeData) {
				badges.push({
					id,
					src: badgeData.url,
					title: badgeData.title,
					alt: badgeData.title,
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

	const fetchChannelBadges = async () => {
		const channelBadgesList = await TwitchServices.IVR.getChannelBadges(channelId);

		channelBadgesList.forEach((badge) => {
			badge.versions.forEach((version) => {
				channelBadges.set(`${badge.set_id}/${version.id}`, {
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

	const fetchChannelEmotes = async () => {
		const [stvEmotes, bttvEmotes, ffzEmotes] = (
			await Promise.allSettled([
				TwitchServices.SevenTV.getChannelEmotes(channelId),
				TwitchServices.BetterTTV.getChannelEmotes(channelId),
				TwitchServices.FrankerFaceZ.getChannelEmotes(channelId),
			])
		).map((p) => (p.status === "fulfilled" ? p.value : []));

		stvEmotes.forEach((emote) => {
			channelEmotes.set(emote.name!, {
				url: `https://7tv.app/emotes/${emote.id}`,
				src: `https://cdn.7tv.app/emote/${emote.id}/1x.webp`,
			});
		});

		bttvEmotes.forEach((emote) => {
			channelEmotes.set(emote.code!, {
				url: `https://betterttv.com/emotes/${emote.id}`,
				src: `https://cdn.betterttv.net/emote/${emote.id}/1x.webp`,
			});
		});

		ffzEmotes.forEach((emote) => {
			channelEmotes.set(emote.name!, {
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
		const emoteProps = channelEmotes.get(word) || globalEmotes.get(word);
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
			return;
		}

		components.push({ type: TextFragment, props: { text: word } });
	};
</script>

<svelte:window on:keydown={windowKeydown} />

<div class="flex w-full max-w-[2500px] flex-col self-center p-5">
	<h1 class="text-4xl font-bold">The Jake Files</h1>
	<p class="mb-2 text-xs font-light">
		{#if files !== null}
			{humanFileSize(files?.reduce((acc, file) => acc + file.size, 0) ?? 0)} &mdash; {files?.length ?? 0} clips from 2020 to 2024
		{:else}
			Loading...
		{/if}
	</p>

	<div class="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
		{#if files !== null}
			{#each files as file, index (file.id)}
				{@const date = dayjs(file.created_at * 1000)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div role="button" tabindex="0" onclick={() => openFile(index)} class="rounded-sm" id="file-card-{index}">
					<div class="relative overflow-hidden">
						<span class="absolute right-0 top-0 m-1 rounded-sm bg-black/60 px-0.5 text-xs tabular-nums text-white" title={date.format(dateTimeFormat)}>
							{date.format("MMM 'YY")}
						</span>
						<span class="absolute bottom-0 right-0 m-1 rounded-sm bg-black/60 px-0.5 text-xs tabular-nums text-white">
							{formatDuration(file.duration, "s")}
						</span>
						<Image src="https://fi.supa.sh/.archive/jake/thumb/{file.id}.jpg" loading="lazy" class="aspect-video w-full rounded-sm" />
					</div>
					<span class="line-clamp-2 py-0.5 text-sm leading-tight" title={file.title}>{file.title}</span>
				</div>
			{/each}
		{:else}
			{#each { length: 60 }}
				<div>
					<Skeleton class="aspect-video w-full rounded-sm" />
					<Skeleton class="my-0.5 h-4 w-3/4"></Skeleton>
				</div>
			{/each}
			<div style="height: 99999px;"></div>
		{/if}
	</div>
</div>

{#if selectedFile !== null}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" tabindex="-1">
		{#if files}
			<div class="flex h-full w-full">
				<div class="flex min-w-80 max-w-80 flex-col overflow-y-scroll overscroll-contain bg-zinc-100 dark:bg-zinc-900" bind:clientHeight={listHeight}>
					<VirtualList height={listHeight} itemCount={files.length} {itemSize}>
						<div
							slot="item"
							let:index
							let:style
							{style}
							class={["flex h-24 cursor-pointer gap-2 overflow-hidden border-b p-2 hover:bg-zinc-200 hover:dark:bg-zinc-800", index === selectedFile && "bg-zinc-300 dark:bg-zinc-800"]}
							onclick={(e) => {
								e.stopPropagation();
								selectedFile = index;
							}}
						>
							{@const file = files[index]}
							<div class="relative aspect-video h-full">
								<span class="absolute bottom-0 right-0 m-1 rounded-sm bg-black/60 px-0.5 text-xs tabular-nums text-white">
									{formatDuration(file.duration, "s")}
								</span>
								<Image src="https://fi.supa.sh/.archive/jake/thumb/{file.id}.jpg" class="h-full rounded-sm" />
							</div>
							<div class="flex min-w-0 flex-col break-words">
								<span class="line-clamp-2 text-sm" title={file.title}>{file.title}</span>
								<span class="mt-auto text-xs text-muted-foreground">{dayjs(file.created_at * 1000).format(dateTimeFormat)}</span>
							</div>
						</div>
					</VirtualList>
				</div>
				<div
					class="flex flex-1 items-center overflow-y-hidden overscroll-contain"
					onclick={() => (selectedFile = null)}
					onwheel={(e) => {
						if (selectedFile === null || !files) return;

						if (selectedFile > 0 && e.deltaY < 0) {
							openFile(selectedFile - 1);
						} else if (selectedFile < files.length - 1 && e.deltaY > 0) {
							openFile(selectedFile + 1);
						}
						e.stopPropagation();
					}}
				>
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						bind:currentTime={currentVideoTime}
						src="https://fi.supa.sh/.archive/jake/{files[selectedFile].id}.mp4"
						class="aspect-video w-full"
						controls
						autoplay
						onclick={(e) => e.stopPropagation()}
					></video>
				</div>
				<div class="flex min-w-80 max-w-80 flex-col overflow-y-scroll overscroll-contain bg-zinc-100 dark:bg-zinc-900">
					<div class="flex justify-center border-b py-4">
						<p class="text-lg font-semibold">Chat Replay</p>
					</div>
					{#if chatError}
						<div class="p-2 text-red-500">{chatError}</div>
					{:else if chatLogs === null}
						<div class="p-2 text-muted-foreground">Loading chat logs...</div>
					{:else if chatLogs.length === 0}
						<div class="p-2 text-muted-foreground">No chat logs found for this date :(</div>
					{:else}
						<div class="flex flex-col gap-y-1 overflow-auto p-2 leading-tight" bind:this={chatList}>
							{#each chatBuffer as msg, index (index)}
								{#if isNewMessageDivider(msg, index)}
									<div class="my-2 flex items-center text-muted-foreground">
										<div class="flex-grow border-t border-muted-foreground"></div>
										<span class="mx-1">New messages</span>
										<div class="flex-grow border-t border-muted-foreground"></div>
									</div>
								{/if}
								<div class="text-wrap break-words">
									{#if msg.tags["badges"]}
										<span class="inline-flex h-5 select-none gap-x-0.5 align-middle empty:hidden">
											{#key badgeUpdates}
												{#each getBadges(msg) as badge (badge.id)}
													<Badge src={badge.src} title={badge.title} alt="" />
												{/each}
											{/key}
										</span>
									{/if}
									<span class:hidden={msg.tags["target-user-id"]} style="color: hsl(from {msg.tags['color'] || 'gray'} h s {$mode === 'light' ? '40%' : '70%'})" class="font-bold">
										{msg.displayName}:
									</span>
									{#key emoteUpdates}
										{#each parseMessage(msg) as { type: Component, props }, index (index)}
											<Component {...props} />
										{/each}
									{/key}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<Skeleton class="h-10 w-40" />
		{/if}
	</div>
{/if}

<div class="active-card hidden"></div>

<style>
	.active-card {
		@apply bg-zinc-800 p-1 text-zinc-50 ring-2 ring-ring;
	}
</style>

