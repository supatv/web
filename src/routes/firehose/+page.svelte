<script lang="ts">
	import dayjs from "dayjs";
	import ReconnectingWebSocket from "reconnecting-websocket";

	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Button } from "$lib/components/ui/button/index.js";

	import * as Select from "$lib/components/ui/select/index.js";
	import * as Card from "$lib/components/ui/card/index.js";

	import FocusTrap from "$lib/components/focus-trap.svelte";

	import VirtualList from "$lib/components/virtual-list.svelte";

	import MessageContent from "$lib/components/message/content.svelte";

	import { ChevronsDownIcon } from "@lucide/svelte";

	import { getContext, onDestroy, onMount, tick, untrack } from "svelte";

	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";

	import { timeFormat, type TitleContext } from "$lib/common";

	import { ChatSource, type Message } from "$lib/twitch/chat.svelte";
	import { messageSearch } from "$lib/twitch/logs";

	import instances from "./instances.json";

	getContext<TitleContext>("title").set("Firehose");

	const lineHeight = 20;

	const chat = new ChatSource();

	let logsList: ReturnType<typeof VirtualList> | undefined = $state();

	let error: string | null = $state(null);
	// let loading = $state(false);

	let isPopoverOpen = $state(false);

	let messagesPerSecond = $state(0);

	let socket: ReconnectingWebSocket | null = $state(null);

	const destroySocket = () => {
		if (socket) {
			socket.close();
			socket = null;
		}
	};

	// let logsBox: HTMLDivElement | null = $state(null);
	let searchInput: HTMLInputElement | null = $state(null);

	let instanceValue = $state("");
	let searchValue = $state("");

	onMount(() => {
		chat.loadGlobalBadges();
		chat.loadGlobalEmotes();

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

			socket = new ReconnectingWebSocket(`wss://${instanceValue}/firehose?jsonBasic=true`);
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

	const resumeScroll = () => {
		scrollPaused = false;
		logsList?.scrollToBottom();
	};

	$effect(() => {
		if (!filteredChatLogs) return;
		untrack(() => {
			if (!scrollPaused) {
				resumeScroll();
			}
		});
	});
</script>

<svelte:head>
	<meta property="og:title" content="Twitch Firehose" />
	<meta name="keywords" content="twitch, twitch firehose, twitch chat, twitch bots, twitch dev, live messages, chat logs, developers, api" />
	<meta name="description" content="View every Twitch chat message in real-time." />
	<meta property="og:description" content="View every Twitch chat message in real-time." />
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
				<Label for="select-instance" class="text-base">Instance</Label>

				<Select.Root type="single" bind:open={isPopoverOpen} bind:value={instanceValue}>
					<Select.Trigger id="select-instance" class="h-8">
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
				<Input id="input-search" maxlength={500} placeholder="Filter..." class="h-8" bind:ref={searchInput} bind:value={searchValue} />
			</div>
		</div>

		<div class="flex min-h-0 w-full flex-1">
			<Card.Root class="relative h-full w-full flex-col overflow-hidden leading-5">
				<VirtualList
					bind:this={logsList}
					itemCount={filteredChatLogs.length}
					itemSize={lineHeight}
					class="overflow-scroll py-2"
					onscroll={({ distanceFromBottom }) => (scrollPaused = distanceFromBottom > lineHeight)}
				>
					{#snippet item(index, style)}
						{@const msg = filteredChatLogs[index]}
						<div class="flex h-5 w-max min-w-full flex-row items-center gap-x-1 text-nowrap px-3" {style}>
							<span class="inline-block min-w-48 max-w-48 overflow-hidden">
								<a href="https://www.twitch.tv/{msg.channel}" target="_blank" title={msg.channel} class="font-bold text-neutral-500">
									#{msg.channel}
								</a>
							</span>
							<span class="select-none text-xs tabular-nums text-neutral-500">{dayjs(msg.timestamp).format(timeFormat)}</span>
							<span class="h-5 w-max">
								<MessageContent {chat} {msg} />
							</span>
						</div>
					{/snippet}
				</VirtualList>
				{#if scrollPaused}
					<div class="pointer-events-none absolute bottom-2 left-0 right-0 flex h-8 items-center justify-center">
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
