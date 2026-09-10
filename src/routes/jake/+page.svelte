<script lang="ts">
	import { Skeleton } from "$lib/components/ui";

	import { dateTimeFormat, formatDuration, humanFileSize, type TitleContext } from "$lib/common";

	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { getContext, onDestroy, onMount, tick, untrack } from "svelte";
	import { MediaQuery } from "svelte/reactivity";

	import Image from "$lib/components/image.svelte";
	import dayjs from "dayjs";

	import MessageContent from "$lib/components/message/content.svelte";
	import Deleted from "$lib/components/message/deleted.svelte";
	import Reply from "$lib/components/message/reply.svelte";
	import ReplyThread from "$lib/components/message/reply-thread.svelte";
	import UserCard from "$lib/components/message/user-card.svelte";
	import VirtualList from "$lib/components/virtual-list.svelte";
	import VirtualGrid from "$lib/components/virtual-grid.svelte";

	import { ChatSource, type ChatUser, type Message } from "$lib/twitch/chat.svelte";
	import { splitDeletions } from "$lib/twitch/logs";
	import { messageNotice, noticeStyle } from "$lib/twitch/notice";

	import { LoaderCircleIcon } from "@lucide/svelte";

	getContext<TitleContext>("title").set("The Jake Files");

	type ArchiveFile = {
		id: string;
		duration: number;
		size: number;
		created_at: number;
		title: string;
	};

	const channelId = "94682428";

	const chat = new ChatSource({ emoteClass: "-my-1 -z-10 max-h-7" });

	let fileList: ReturnType<typeof VirtualList> | undefined = $state();
	let chatList: ReturnType<typeof VirtualList> | undefined = $state();
	let cardGrid: ReturnType<typeof VirtualGrid> | undefined = $state();
	const itemSize = 96;
	const chatItemSize = 26;
	let chatAtBottom = true;

	// the breakpoints the css grid held the cards on before they were virtualized
	const md = new MediaQuery("min-width: 48rem");
	const lg = new MediaQuery("min-width: 64rem");
	const xl = new MediaQuery("min-width: 80rem");
	const wide = new MediaQuery("min-width: 96rem");
	const columns = $derived(wide.current ? 6 : xl.current ? 5 : lg.current ? 4 : md.current ? 3 : 2);

	// gap-2, and the two clamped title lines under the 16:9 thumbnail plus their padding
	const gap = 8;
	const cardChrome = 39;

	const skeletonCount = 60;

	let selectedFile: number | null = $state(null);
	// the card the reader came back from stays marked after the player closes
	let lastOpened: number | null = $state(null);

	let currentVideoTime = $state(0);

	let chatLogs: Message[] | null = $state(null);
	let chatBuffer: Message[] = $state([]);
	let deletedIds: Set<string> = $state(new Set());

	let chatError = $state("");

	let threadMsg: Message | null = $state(null);
	let cardUser: ChatUser | null = $state(null);

	let files: ArchiveFile[] | null = $state(null);

	const fileEntries: ArchiveFile[] = $derived(files ?? []);

	const cardKey = (index: number) => files?.[index]?.id ?? index;

	const fetchFiles = async () => {
		const res = await fetch("https://fi.supa.sh/.archive/jake/files.json");
		files = await res.json();

		const fileId = page.url.searchParams.get("i");
		if (fileId) {
			const fileIndex = files?.findIndex((f) => f.id === fileId);
			if (fileIndex !== undefined && fileIndex !== -1) openFile(fileIndex);
		}
	};

	const openFile = async (index: number) => {
		selectedFile = index;
		currentVideoTime = 0;

		await tick();
		fileList?.scrollToIndex(index, "center");
	};

	let logsController: AbortController | null = null;
	$effect(() => {
		if (!files) return;

		if (selectedFile === null) {
			untrack(() => goto(page.url.pathname, { replaceState: true, keepFocus: true, noScroll: true }));
			return;
		}

		const index = selectedFile;
		const file = files[index];
		if (!file) return;

		untrack(async () => {
			chatLogs = null;
			chatBuffer = [];
			chatAtBottom = true;

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

		untrack(async () => {
			await goto(`?i=${file.id}`, { replaceState: true, keepFocus: true, noScroll: true });

			lastOpened = index;
			cardGrid?.scrollToIndex(index, "center");
		});
	});

	const windowKeydown = (event: KeyboardEvent) => {
		// escape closes the thread dialog before it closes the file it was opened from
		if (selectedFile === null || !files || threadMsg) return;

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
		const file = files?.[selectedFile ?? -1];
		if (!file) return false;

		const clipStart = file.created_at - file.duration;
		const msgSec = new Date(msg.timestamp).getTime() / 1000;
		const prevSec = index > 0 ? new Date(chatBuffer[index - 1].timestamp).getTime() / 1000 : -Infinity;

		return msgSec > clipStart && prevSec <= clipStart;
	};

	onMount(() => {
		fetchFiles();
		chat.loadGlobalBadges();
		chat.loadGlobalEmotes();
		chat.loadChannelBadges(channelId);
		chat.loadChannelEmotes(channelId);
	});

	let chatRenderInterval: NodeJS.Timeout | null = setInterval(async () => {
		if (selectedFile === null) return;
		const file = files?.[selectedFile];
		if (!file) return;

		// deletions come out of the slice the replay has reached, so a message is only struck once the
		// moderator got to it
		const log = splitDeletions(chatLogs?.filter((msg) => new Date(msg.timestamp).getTime() <= currentVideoTime * 1000 + (file.created_at - file.duration) * 1000) ?? []);
		chatBuffer = log.messages;
		deletedIds = log.deleted;

		if (chatAtBottom) {
			await tick();
			chatList?.scrollToBottom();
		}
	}, 250);

	onDestroy(() => {
		if (chatRenderInterval) clearInterval(chatRenderInterval);
	});
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

	<VirtualGrid bind:this={cardGrid} windowScroll {columns} {gap} itemCount={files?.length ?? skeletonCount} itemSize={(width) => width * (9 / 16) + cardChrome} key={cardKey}>
		{#snippet item(index, style)}
			{@const file = files?.[index]}
			{#if file}
				{@const date = dayjs(file.created_at * 1000)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div {style} role="button" tabindex="0" onclick={() => openFile(index)} class={["rounded-sm", index === lastOpened && "ring-accent rounded-md ring-2"]}>
					<div class="relative overflow-hidden">
						<span class="absolute top-0 right-0 m-1 rounded-sm bg-black/60 px-0.5 text-xs text-white tabular-nums" title={date.format(dateTimeFormat)}>
							{date.format("MMM 'YY")}
						</span>
						<span class="absolute right-0 bottom-0 m-1 rounded-sm bg-black/60 px-0.5 text-xs text-white tabular-nums">
							{formatDuration(file.duration, "s")}
						</span>
						<Image src="https://fi.supa.sh/.archive/jake/thumb/{file.id}.jpg" class="aspect-video w-full rounded-sm" />
					</div>
					<span class="line-clamp-2 py-0.5 text-sm leading-tight" title={file.title}>{file.title}</span>
				</div>
			{:else}
				<div {style}>
					<Skeleton class="aspect-video w-full rounded-sm" />
					<Skeleton class="my-0.5 h-4 w-3/4"></Skeleton>
				</div>
			{/if}
		{/snippet}
	</VirtualGrid>

	{#if files === null}
		<!-- the page has to stay tall enough for the browser to restore a deep scroll onto the cards that are still loading -->
		<div style="height: 99999px;"></div>
	{/if}
</div>

{#if selectedFile !== null}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" tabindex="-1">
		{#if files}
			<div class="flex h-full w-full flex-col md:flex-row">
				<div onclick={() => (selectedFile = null)} role="button" tabindex="0" class="bg-surface border-line block border-b py-2 text-center text-sm font-medium md:hidden">Close</div>
				<div class="bg-surface border-line order-last flex h-2/5 w-full flex-col overflow-y-hidden overscroll-contain md:order-0 md:h-full md:max-w-80 md:min-w-80 md:border-r">
					<VirtualList bind:this={fileList} itemCount={fileEntries.length} {itemSize} class="overflow-x-hidden">
						{#snippet item(index, style)}
							{@const file = fileEntries[index]}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								{style}
								class={["border-line hover:bg-raised flex w-full cursor-pointer gap-2 overflow-hidden border-b p-2 transition-colors", index === selectedFile && "bg-raised"]}
								onclick={(e) => {
									e.stopPropagation();
									selectedFile = index;
								}}
							>
								<div class="relative aspect-video h-full">
									<span class="absolute right-0 bottom-0 m-1 rounded-sm bg-black/60 px-0.5 text-xs text-white tabular-nums">
										{formatDuration(file.duration, "s")}
									</span>
									<Image src="https://fi.supa.sh/.archive/jake/thumb/{file.id}.jpg" class="h-full rounded-sm" />
								</div>
								<div class="flex min-w-0 flex-col wrap-break-word">
									<span class="line-clamp-2 text-sm" title={file.title}>{file.title}</span>
									<span class="text-dim mt-auto text-xs">{dayjs(file.created_at * 1000).format(dateTimeFormat)}</span>
								</div>
							</div>
						{/snippet}
					</VirtualList>
				</div>
				<div
					class="flex w-full items-center overflow-y-hidden overscroll-contain md:border-none"
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
						class="aspect-video max-h-full w-full"
						controls
						autoplay
						playsinline={true}
						onclick={(e) => e.stopPropagation()}
					></video>
				</div>
				<div class="bg-surface border-line flex w-full flex-1 flex-col overflow-y-hidden overscroll-contain md:max-w-80 md:min-w-80 md:border-l">
					<div class="hidden justify-center border-b py-2 md:flex">
						<p class="text-lg font-semibold">Chat Replay</p>
					</div>
					{#if chatError}
						<div class="text-warn p-2 text-sm">{chatError}</div>
					{:else if chatLogs === null}
						<div class="text-dim p-2 text-sm">Loading chat logs...</div>
					{:else if chatLogs.length === 0}
						<div class="text-dim p-2 text-sm">No chat logs found for this date :(</div>
					{:else}
						<VirtualList
							bind:this={chatList}
							itemCount={chatBuffer.length}
							itemSize={chatItemSize}
							dynamic
							class="overflow-x-hidden overflow-y-scroll p-2 leading-tight"
							onscroll={({ distanceFromBottom }) => (chatAtBottom = distanceFromBottom < 50)}
						>
							{#snippet item(index, style)}
								{@const msg = chatBuffer[index]}
								{@const notice = messageNotice(msg)}
								<!-- the gap the rows used to sit in belongs to the row itself now that each one is placed absolutely -->
								<div class="w-full pb-1.5" {style}>
									{#if isNewMessageDivider(msg, index)}
										<div class="text-dim my-2 flex items-center text-xs">
											<div class="border-line grow border-t"></div>
											<span class="mx-1">New messages</span>
											<div class="border-line grow border-t"></div>
										</div>
									{/if}
									{#if deletedIds.has(msg.id)}
										<Deleted />
									{/if}
									{#if msg.tags["reply-parent-msg-id"]}
										<Reply {msg} onclick={() => (threadMsg = msg)} />
									{/if}
									<div class={["-mx-1 rounded-sm px-1 text-wrap wrap-break-word", notice && noticeStyle[notice.tone].row]}>
										<MessageContent {chat} {msg} onuserclick={(user) => (cardUser = user)} />
									</div>
								</div>
							{/snippet}
						</VirtualList>
					{/if}
				</div>
			</div>
		{:else}
			<LoaderCircleIcon class="size-8 animate-spin" />
		{/if}
	</div>
{/if}

<ReplyThread {chat} messages={chatBuffer} bind:msg={threadMsg} />
<UserCard bind:user={cardUser} />
