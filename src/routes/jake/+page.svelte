<script lang="ts">
	import { Skeleton } from "$lib/components/ui";

	import { dateTimeFormat, formatDuration, humanFileSize, type TitleContext } from "$lib/common";

	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { getContext, onDestroy, onMount, tick, untrack } from "svelte";

	import Image from "$lib/components/image.svelte";
	import dayjs from "dayjs";

	import MessageContent from "$lib/components/message/content.svelte";
	import VirtualList from "$lib/components/virtual-list.svelte";

	import { ChatSource, type Message } from "$lib/twitch/chat.svelte";

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
	let chatList: HTMLDivElement | null = $state(null);
	const itemSize = 96;

	let selectedFile: number | null = $state(null);

	let currentVideoTime = $state(0);

	let chatLogs: Message[] | null = $state(null);
	let chatBuffer: Message[] = $state([]);

	let chatError = $state("");

	let files: ArchiveFile[] | null = $state(null);

	const fileEntries: ArchiveFile[] = $derived(files ?? []);

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

		const file = files[selectedFile];
		if (!file) return;

		untrack(async () => {
			chatLogs = null;
			chatBuffer = [];

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

			const style = ["ring-2", "ring-accent", "rounded-md"];
			document.querySelector(".active-card")?.classList.remove("active-card", ...style);
			const fileCard = document.getElementById(`file-card-${selectedFile}`);
			if (!fileCard) return;
			fileCard.scrollIntoView({ behavior: "smooth", block: "center" });
			fileCard.classList.add("active-card", ...style);
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
						<span class="absolute top-0 right-0 m-1 rounded-sm bg-black/60 px-0.5 text-xs text-white tabular-nums" title={date.format(dateTimeFormat)}>
							{date.format("MMM 'YY")}
						</span>
						<span class="absolute right-0 bottom-0 m-1 rounded-sm bg-black/60 px-0.5 text-xs text-white tabular-nums">
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
			<div class="flex h-full w-full flex-col md:flex-row">
				<div onclick={() => (selectedFile = null)} role="button" tabindex="0" class="bg-surface border-line block border-b py-2 text-center text-sm font-medium md:hidden">Close</div>
				<div class="bg-surface border-line order-last flex h-2/5 w-full flex-col overflow-y-hidden overscroll-contain md:order-0 md:h-full md:border-r md:max-w-80 md:min-w-80">
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
						<div class="flex h-full flex-col gap-y-1.5 overflow-y-scroll p-2 leading-tight" bind:this={chatList}>
							{#each chatBuffer as msg, index (index)}
								{#if isNewMessageDivider(msg, index)}
									<div class="text-dim my-2 flex items-center text-xs">
										<div class="border-line grow border-t"></div>
										<span class="mx-1">New messages</span>
										<div class="border-line grow border-t"></div>
									</div>
								{/if}
								<div class="text-wrap wrap-break-word">
									<MessageContent {chat} {msg} />
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<LoaderCircleIcon class="size-8 animate-spin" />
		{/if}
	</div>
{/if}
