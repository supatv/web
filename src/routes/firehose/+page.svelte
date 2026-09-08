<script lang="ts">
	import dayjs from "dayjs";
	import ReconnectingWebSocket from "reconnecting-websocket";

	import { Button, Input, Label, Panel, Select, type SelectOption } from "$lib/components/ui";

	import VirtualList from "$lib/components/virtual-list.svelte";

	import MessageContent from "$lib/components/message/content.svelte";
	import Deleted from "$lib/components/message/deleted.svelte";
	import Reply from "$lib/components/message/reply.svelte";
	import ReplyThread from "$lib/components/message/reply-thread.svelte";
	import UserCard from "$lib/components/message/user-card.svelte";

	import { ChevronsDownIcon } from "@lucide/svelte";

	import { getContext, onDestroy, onMount, tick, untrack } from "svelte";
	import { SvelteSet } from "svelte/reactivity";

	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";

	import { timeFormat, type TitleContext } from "$lib/common";

	import { ChatSource, type ChatUser, type Message } from "$lib/twitch/chat.svelte";
	import { messageNotice, noticeStyle } from "$lib/twitch/notice";
	import { messageSearch } from "$lib/twitch/logs";

	import instances from "./instances.json";

	getContext<TitleContext>("title").set("Firehose");

	const lineHeight = 24;

	const chat = new ChatSource();

	let logsList: ReturnType<typeof VirtualList> | undefined = $state();

	let error: string | null = $state(null);

	let messagesPerSecond = $state(0);

	let socket: ReconnectingWebSocket | null = $state(null);

	const destroySocket = () => {
		if (socket) {
			socket.close();
			socket = null;
		}
	};

	let searchInput: HTMLInputElement | null = $state(null);

	const instanceOptions: SelectOption[] = Object.entries(instances).map(([value, label]) => ({ value, label }));

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
	let chatRenderRun = 0;

	let chatLogs: Message[] = $state([]);
	let chatBuffer: Message[] = [];
	const deletedIds = new SvelteSet<string>();

	let scrollPaused = $state(false);

	let threadMsg: Message | null = $state(null);
	let cardUser: ChatUser | null = $state(null);

	const renderChat = async () => {
		if (chatRenderTimeout) clearTimeout(chatRenderTimeout);
		const run = ++chatRenderRun;

		if (document.hidden) {
			// timers are throttled to ~1/min in a hidden tab, so trim the backlog to what the list would have kept
			if (chatBuffer.length > 10_000) chatBuffer = chatBuffer.slice(-10_000);
		} else {
			chatLogs = chatLogs.concat(chatBuffer).slice(!scrollPaused ? -10_000 : 0);
			chatBuffer = [];

			// deletions outlive the rows they mark, so once they have piled up drop the ones no row is left to show
			if (deletedIds.size > 10_000) {
				const shown = new Set(chatLogs.map((msg) => msg.id));
				for (const id of deletedIds) if (!shown.has(id)) deletedIds.delete(id);
			}
			await tick();
		}

		if (run !== chatRenderRun) return;
		chatRenderTimeout = setTimeout(renderChat, 250);
	};
	if (browser) renderChat();

	const visibilityChange = () => {
		if (!document.hidden) renderChat();
	};

	$effect(() => {
		if (!instanceValue) return;
		untrack(() => {
			destroySocket();
			chatLogs = [];
			chatBuffer = [];
			scrollPaused = false;

			deletedIds.clear();

			socket = new ReconnectingWebSocket(`wss://${instanceValue}/firehose?jsonBasic=true`);
			socket.addEventListener("message", (event) => {
				if (!document.hidden) {
					messagesPerSecond++;
					setTimeout(() => {
						messagesPerSecond--;
					}, 1000);
				}

				const msg: Message = JSON.parse(event.data);
				const deleted = msg.tags["target-msg-id"];
				if (deleted) deletedIds.add(deleted);
				else chatBuffer.push(msg);
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
<svelte:document on:visibilitychange={visibilityChange} />

<div id="main-fit-screen" class="hidden"></div>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:overflow-y-visible">
	<header class="flex flex-wrap items-baseline gap-x-3">
		<h1 class="font-display text-3xl font-bold tracking-tight">Twitch Firehose</h1>
		<p class="text-dim text-base">
			<span class="font-display text-accent font-semibold tabular-nums">{messagesPerSecond.toLocaleString()}</span> messages per second
		</p>
	</header>

	{#if error}
		<p class="text-warn text-sm">{error}</p>
	{:else}
		<div class="flex flex-wrap items-end gap-2">
			<div class="flex flex-col gap-1">
				<Label for="select-instance">Instance</Label>
				<Select id="select-instance" bind:value={instanceValue} options={instanceOptions} class="w-52" />
			</div>

			<div class="flex min-w-52 flex-1 flex-col gap-1">
				<Label for="input-search">Filter</Label>
				<Input id="input-search" maxlength={500} placeholder="Match channel, user or message..." bind:ref={searchInput} bind:value={searchValue} />
			</div>
		</div>

		<Panel class="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden leading-5 max-md:min-h-[60svh]">
			<VirtualList
				bind:this={logsList}
				itemCount={filteredChatLogs.length}
				itemSize={lineHeight}
				dynamic
				class="overflow-x-hidden overflow-y-scroll overscroll-contain py-2"
				onscroll={({ distanceFromBottom }) => (scrollPaused = distanceFromBottom > lineHeight)}
			>
				{#snippet item(index, style)}
					{@const msg = filteredChatLogs[index]}
					{@const notice = messageNotice(msg)}
					<!-- the message sits on the last row so the deletion note and the reply preview can take the rows above
						it in the message's own column; without either, those are empty tracks and cost nothing. below `md`
						the channel gets a line of its own above the timestamp rather than eating a third of the width -->
					<div class={["grid w-full grid-cols-[auto_1fr] items-start gap-x-1 px-3 py-0.5 md:grid-cols-[auto_auto_1fr]", notice && noticeStyle[notice.tone].row]} {style}>
						{#if deletedIds.has(msg.id)}
							<Deleted class="col-start-2 row-start-2 md:col-start-3 md:row-start-1" />
						{/if}
						{#if msg.tags["reply-parent-msg-id"]}
							<Reply {msg} onclick={() => (threadMsg = msg)} class="col-start-2 row-start-3 md:col-start-3 md:row-start-2" />
						{/if}
						<!-- `text-xs` carries a line-height of its own, so the row's `leading-5` has to be restated for these
							two to sit on the same line box as the message beside them -->
						<a
							href="https://www.twitch.tv/{msg.channel}"
							target="_blank"
							title={msg.channel}
							class="text-dim hover:text-accent col-span-2 col-start-1 row-start-1 inline-block w-fit max-w-full truncate text-xs leading-5 font-semibold transition-colors select-none md:col-span-1 md:row-start-3 md:w-auto md:max-w-32 md:min-w-32"
						>
							{msg.channel}
						</a>
						<span class="text-dim/80 col-start-1 row-start-4 text-xs leading-5 tabular-nums select-none md:col-start-2 md:row-start-3">{dayjs(msg.timestamp).format(timeFormat)}</span>
						<span class="col-start-2 row-start-4 min-w-0 wrap-break-word md:col-start-3 md:row-start-3">
							<MessageContent {chat} {msg} onuserclick={(user) => (cardUser = user)} />
						</span>
					</div>
				{/snippet}
			</VirtualList>

			{#if scrollPaused}
				<div class="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
					<Button variant="solid" size="md" class="pointer-events-auto px-6 shadow-lg" onclick={resumeScroll}>
						<ChevronsDownIcon />
						More messages below
					</Button>
				</div>
			{/if}
		</Panel>
	{/if}
</div>

<ReplyThread {chat} messages={chatLogs} bind:msg={threadMsg} />
<UserCard bind:user={cardUser} />
