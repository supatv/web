<script lang="ts">
	import dayjs from "dayjs";

	import { CalendarDate, type DateValue } from "@internationalized/date";
	import { getContext, onMount, tick, untrack } from "svelte";
	import { SvelteURLSearchParams } from "svelte/reactivity";

	import { browser } from "$app/environment";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";

	import { LoaderCircleIcon, FileTextIcon, ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon, CalendarIcon, ExternalLinkIcon, FilterIcon, SearchIcon, ChartColumnIcon } from "@lucide/svelte";

	import { Button, Calendar, Input, Label, Panel, Popover, Select, Skeleton, type SelectOption } from "$lib/components/ui";
	import VirtualList from "$lib/components/virtual-list.svelte";
	import MessageContent from "$lib/components/message/content.svelte";

	import { compactNumber, dateTimeFormat, type TitleContext } from "$lib/common";
	import { ChatSource, type Message } from "$lib/twitch/chat.svelte";
	import { messageSearch } from "$lib/twitch/logs";

	type LogsDate = {
		year: string;
		month: string;
		day?: string;
	};

	type StatsResponse = {
		userLogin?: string;
		userId: string;
		messageCount: number;
		topChatters?: Array<{ userId: string; userLogin?: string; messageCount: number }>;
	};

	getContext<TitleContext>("title").set("Logs");

	const lineHeight = 20;

	const chat = new ChatSource();

	let error: string | null = $state(null);
	let loading = $state(false);

	let datePopoverOpen = $state(false);

	let selectedIndex = $state(0); // Track selected item

	let availableDates: LogsDate[] = $state([]);
	let calendarDate = $state<DateValue>();
	let dateValue = $state("");

	const availableYears = $derived(new Set(availableDates.map((date) => date.year)));
	const availableMonthsByYear = $derived(
		availableDates.reduce(
			(acc, date) => {
				const months = (acc[date.year] ??= []);
				if (!months.includes(date.month)) months.push(date.month);
				return acc;
			},
			{} as Record<string, string[]>
		)
	);

	const monthOptions = $derived(calendarDate ? (availableMonthsByYear[calendarDate.year] ?? []).map(Number).sort((a, b) => a - b) : []);

	const yearOptions = $derived(
		Array.from(availableYears)
			.map(Number)
			.sort((a, b) => a - b)
	);

	const dateOptions: SelectOption[] = $derived(
		availableDates.map((date, index) => {
			const value = `${date.year}-${date.month.padStart(2, "0")}${date.day ? `-${date.day.padStart(2, "0")}` : ""}`;
			return { value, label: value, separatorBefore: index > 0 && date.year !== availableDates[index - 1].year };
		})
	);

	const availableDateSet = $derived(new Set(availableDates.map((d) => `${d.year}-${d.month}${d.day ? `-${d.day}` : ""}`)));

	const isDateAvailable = (date: DateValue) => {
		return availableDateSet.has(`${date.year}-${date.month}${date.day ? `-${date.day}` : ""}`);
	};

	let channelsCount = $state(0);
	let foundChannels: { name: string; userID: string }[] = $state([]);
	let channelTyped = $state(false);

	const fetchChannelsCount = async () => {
		const res = await fetch("https://logs.zonian.dev/health");
		if (!res.ok) return;

		const data = await res.json();
		channelsCount = data.channels ?? 0;
	};

	$effect(() => {
		const query = inputChannelName.trim();
		if (!query || !channelTyped) {
			foundChannels = [];
			return;
		}

		const controller = new AbortController();
		const timeout = setTimeout(async () => {
			try {
				const res = await fetch(`https://logs.zonian.dev/meta/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
				if (!res.ok) throw res;

				const data = await res.json();
				foundChannels = (data.channels ?? []).slice(0, 5);
				selectedIndex = 0;
			} catch (err) {
				if ((err as Error)?.name !== "AbortError") foundChannels = [];
			}
		}, 60);

		return () => {
			clearTimeout(timeout);
			controller.abort();
		};
	});

	let isJumpMode = $state(false);
	onMount(() => {
		fetchChannelsCount();
		chat.loadGlobalBadges();
		chat.loadGlobalEmotes();

		const q = page.url.searchParams;
		if (q.has("channel")) {
			q.set("c", q.get("channel") || "");
			q.delete("channel");
		}
		if (q.has("username")) {
			q.set("u", q.get("username") || "");
			q.delete("username");
		}
		goto(page.url.search + page.url.hash, { replaceState: true, keepFocus: true });

		inputChannelName = channelName = q.get("c") || "";
		inputUserName = userName = q.get("u") || "";
		inputQuery = query = q.get("q") || "";
		dateValue = q.get("d") || "";
		searchValue = q.get("s") || "";
		isJumpMode = (q.get("sm") || window.localStorage.getItem("logs-search-mode")) === "jump";
	});

	let logsList: ReturnType<typeof VirtualList> | undefined = $state();
	let inputChannelName = $state("");
	let channelName = $state("");
	let inputUserName = $state("");
	let userName = $state("");

	let activeElement: HTMLElement | null = $state(null);
	let channelInput: HTMLInputElement | null = $state(null);
	let searchInput: HTMLInputElement | null = $state(null);

	let scrollFromBottom = $state(browser && window.localStorage.getItem("logs-bottom-scroll-state") === "true");

	let channelId = $state("");

	// Channel Stats
	let statsPopoverOpen = $state(false);
	let channelStats = $state<StatsResponse | null>(null);
	let statsError = $state<string | null>(null);

	// Query mode
	let inputQuery = $state("");
	let query = $state("");
	let isQueryMode = $derived(Boolean(query.trim()));

	$effect(() => {
		const search = {
			c: channelName,
			u: userName,
			d: dateValue,
			s: searchValue,
			sm: searchValue && isJumpMode ? "jump" : null,
			q: isQueryMode ? query : null,
		};

		untrack(() => {
			const query = page.url.searchParams;

			for (const [key, value] of Object.entries(search)) {
				if (!value) {
					query.delete(key);
				} else if (value !== query.get(key)) {
					query.set(key, value);
				}
			}

			if (!isJumpSearching && chatLogs.length) page.url.hash = "";

			goto(page.url.search + page.url.hash, { replaceState: true, keepFocus: true });
		});
	});

	const showAutocomplete = $derived(browser && channelInput === activeElement && foundChannels.length && !(foundChannels.length === 1 && foundChannels[0].name === inputChannelName.toLowerCase()));

	const channelKeydown = (event: KeyboardEvent) => {
		if (!showAutocomplete) return;

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				selectedIndex = (selectedIndex + 1) % foundChannels.length;
				break;
			case "ArrowUp":
				event.preventDefault();
				selectedIndex = selectedIndex <= 0 ? foundChannels.length - 1 : selectedIndex - 1;
				break;
			case "Tab":
			case "Enter":
				// event.preventDefault();
				if (selectedIndex >= 0) {
					selectResult(selectedIndex);
				}
				break;
		}
	};

	const windowKeydown = (event: KeyboardEvent) => {
		const isMod = event.ctrlKey || event.metaKey;
		const isSearchFocused = searchInput === activeElement;
		if (isMod && event.key === "f") {
			if (isSearchFocused) {
				searchModeToggle();
			}

			searchInput?.focus();
			event.preventDefault();
		}

		if (isSearchFocused && (event.key === "Enter" || event.key === "F3" || (isMod && event.key === "g"))) {
			if (isJumpSearching) {
				if (event.shiftKey) {
					searchJumpPrevious();
				} else {
					searchJumpNext();
				}
			}

			event.preventDefault();
		}
	};

	let chatLogs: Message[] = $state([]);

	let searchValue = $state("");
	let searchResults = $derived(messageSearch(searchValue, chatLogs, scrollFromBottom));
	let filteredChatLogs = $derived(isJumpMode ? messageSearch("", chatLogs, scrollFromBottom) : searchResults);
	let isJumpSearching = $derived(isJumpMode && searchResults.length && searchValue);
	let jumpHighlights = $derived(isJumpSearching ? new Set(searchResults.map((m) => getMessageId(m))) : void 0);
	let jumpIndex = $derived(isJumpSearching ? searchResults.findIndex((m) => getMessageId(m) === page.url.hash.slice(1)) : -1);
	let jumpInputValue = $state(1);

	let displayMessageCount = $derived.by(() => {
		if (searchValue && !isJumpMode) {
			return `${searchResults.length.toLocaleString()} / ${chatLogs.length.toLocaleString()}`;
		}
		return chatLogs.length.toLocaleString();
	});

	$effect(() => {
		if (!filteredChatLogs) return;
		untrack(async () => {
			await tick();
			if (scrollFromBottom) logsList?.scrollToBottom();
			else logsList?.scrollTo(0);
		});
	});

	$effect(() => {
		if (!isJumpSearching || jumpIndex === -1) {
			jumpInputValue = 1;
			return;
		}
		jumpInputValue = jumpIndex + 1;
	});

	$effect(() => {
		if (!isJumpSearching || jumpIndex >= 0) return;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		searchInput;
		untrack(() => {
			jumpToMessage(0);
		});
	});

	$effect(() => {
		if (!isJumpSearching) return;
		const val = jumpInputValue - 1;
		untrack(() => {
			if (val !== jumpIndex) {
				jumpToMessage(val);
			}
		});
	});

	$effect(() => {
		const id = page.url.hash.slice(1);
		if (!id) return;
		const msgIdx = filteredChatLogs.findIndex((m) => getMessageId(m) === id);
		if (msgIdx === -1) return;
		untrack(async () => {
			await tick();
			logsList?.scrollToIndex(msgIdx, "center");
		});
	});

	const dateContent = $derived.by(() => {
		const [year, month, day] = String(dateValue).split("-");
		if (!year || !month) {
			const firstDate = availableDates[0];
			if (!firstDate) return;
			untrack(() => (dateValue = `${firstDate.year}-${firstDate.month.padStart(2, "0")}${firstDate.day ? `-${firstDate.day.padStart(2, "0")}` : ""}`));
			return firstDate;
		}
		return { year, month, day };
	});

	const parseChannelUser = (channel: string, user: string, params: boolean) => {
		channel = channel.toLowerCase();
		user = user.toLowerCase();

		let channelType = "channel";
		if (channel.startsWith("id:")) {
			channelType += "id";
			channel = channel.slice(3);
		}

		let userType = "user";
		if (user.startsWith("id:")) {
			userType += "id";
			user = user.slice(3);
		}

		channel = channel.trim();
		user = user.trim();

		if (params) return `${channelType}=${encodeURIComponent(channel)}${user ? `&${userType}=${encodeURIComponent(user)}` : ""}`;
		else return `${channelType}/${encodeURIComponent(channel)}${user ? `/${userType}/${encodeURIComponent(user)}` : ""}`;
	};

	const fetchChannelStats = async () => {
		if (!channelName) return;

		statsError = null;

		try {
			const res = await fetch(`https://logs.zonian.dev/${parseChannelUser(channelName, userName, false)}/stats`);
			if (!res.ok) {
				if (res.status === 404) statsError = "No stats found for this channel";
				else statsError = `Error from server: ${res.status} ${res.statusText}`;
				return;
			}

			channelStats = await res.json();
		} catch (err) {
			statsError = err instanceof Error ? err.message : "Failed to fetch channel stats";
		}
	};

	$effect(() => {
		if (statsPopoverOpen && !channelStats) {
			fetchChannelStats();
		}
	});

	$effect(() => {
		// fetch available dates
		if (isQueryMode || !channelName) return;
		untrack(async () => {
			loading = true;

			const res = await fetch(`https://logs.zonian.dev/list?${parseChannelUser(channelName, userName, true)}`);
			if (!res.ok) {
				if (res.status === 404) error = `No logs found for this channel ${userName ? "and user" : ""}`;
				else error = `Error from server: ${res.status} ${res.statusText}`;
				loading = false;
				dateValue = "";
				throw error;
			}

			const data: { availableLogs: LogsDate[] } = await res.json();
			availableDates = data.availableLogs;
			// loading = false;
		});
	});

	let logsController: AbortController | null = null;
	$effect(() => {
		// fetch logs
		const date = dateContent;
		if (!date && !query) return;

		untrack(async () => {
			error = null;
			loading = true;

			logsController?.abort();
			logsController = new AbortController();

			const logsParams = new SvelteURLSearchParams({ jsonBasic: "1" });
			if (isQueryMode) logsParams.set("q", query);
			const res = await fetch(
				`https://logs.zonian.dev/
					${parseChannelUser(channelName, userName, false)}
					${date ? `/${date.year}/${date.month}${date.day ? `/${date.day}` : ""}` : "/search"}
					?${logsParams}`,
				{
					signal: logsController.signal,
				}
			);
			if (!res.ok) {
				if (res.status === 404) error = "No results found";
				else error = `Error from server: ${res.status} ${res.statusText}`;
				loading = false;
				throw error;
			}

			const data: { messages: Message[] } = await res.json();
			chatLogs = data.messages;
			loading = false;

			channelId = data.messages.find((m) => m.tags["room-id"])?.tags["room-id"] ?? "";
		});
	});

	$effect(() => {
		chat.loadChannelBadges(channelId);
		chat.loadChannelEmotes(channelId);
	});

	const closestTo = (target: number, values: number[]) => values.sort((a, b) => a - b).reduce((prev, curr) => (Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev));

	const findClosestAvailableDate = (date: DateValue) => {
		const yearDates = availableDates.filter((d) => Number(d.year) === date.year);
		if (!yearDates.length) return null;

		const month = closestTo(date.month, [...new Set(yearDates.map((d) => Number(d.month)))]);
		const days = yearDates.filter((d) => Number(d.month) === month).map((d) => parseInt(d.day || "1"));

		return new CalendarDate(date.year, month, closestTo(date.day, days));
	};

	const adjustDate = (date: DateValue) => {
		if (!isDateAvailable(date)) {
			const closestDate = findClosestAvailableDate(date);
			if (closestDate) {
				updateDateValue(closestDate);
			}
		} else {
			updateDateValue(date);
		}
	};

	$effect(() => {
		if (dateValue) {
			const [year, month, day] = dateValue.split("-");
			calendarDate = new CalendarDate(parseInt(year), parseInt(month), parseInt(day));
		}
	});

	const updateDateValue = (date: DateValue | undefined) => {
		if (date) {
			calendarDate = date;
			const year = calendarDate.year;
			const month = String(calendarDate.month).padStart(2, "0");
			const day = calendarDate.day ? String(calendarDate.day).padStart(2, "0") : undefined;
			dateValue = `${year}-${month}${day ? `-${day}` : ""}`;
		}
	};

	const formSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		if (loading || !inputChannelName) return;

		// force reload
		channelName = "";
		userName = "";
		query = "";

		// reset
		availableDates = [];
		dateValue = "";
		chatLogs = [];
		channelStats = null;
		channelTyped = false;

		if (inputQuery.trim() && !inputUserName) {
			error = "User is required for global search";
			return;
		}

		channelName = inputChannelName;
		userName = inputUserName;
		query = inputQuery.trim();
	};

	const selectResult = (index: number) => {
		inputChannelName = foundChannels[index].name;
		selectedIndex = 0; // reset selection after choosing
	};

	const scrollFromBottomToggle = () => {
		scrollFromBottom = !scrollFromBottom;
		window.localStorage.setItem("logs-bottom-scroll-state", scrollFromBottom.toString());
	};

	const searchModeToggle = () => {
		isJumpMode = !isJumpMode;
		window.localStorage.setItem("logs-search-mode", isJumpMode ? "jump" : "filter");
	};

	const jumpToMessage = (index: number) => {
		const msg = searchResults[index];
		const id = msg && getMessageId(searchResults[index]);
		if (!id) return;
		jumpInputValue = index + 1;
		goto(page.url.search + `#${id}`, { replaceState: true, keepFocus: true });
	};

	const searchJumpNext = () => {
		if (!searchResults.length) return;
		jumpToMessage((jumpIndex + 1) % searchResults.length);
	};

	const searchJumpPrevious = () => {
		if (!searchResults.length) return;
		jumpToMessage((jumpIndex - 1 + searchResults.length) % searchResults.length);
	};

	const getMessageId = (msg: Message) => msg.id || msg.timestamp;

	// a CLEARMSG row would otherwise scan the whole log to name the message it removed
	let messagesById = new Map<string, Message>();
	let messagesByIdFor: Message[] | null = null;
	const messageById = (id: string) => {
		if (messagesByIdFor !== chatLogs) {
			messagesById = new Map(chatLogs.filter((m) => m.id).map((m) => [m.id, m]));
			messagesByIdFor = chatLogs;
		}
		return messagesById.get(id);
	};

	// same reason as the parse cache in ChatSource: three dayjs parses per row per scroll tick
	const times = new WeakMap<Message, { at: string; day: string }>();
	const messageTime = (msg: Message) => {
		let time = times.get(msg);
		if (!time) {
			const parsed = dayjs(msg.timestamp);
			time = { at: parsed.format(dateTimeFormat), day: parsed.format("YYYY-MM-DD") };
			times.set(msg, time);
		}
		return time;
	};
</script>

<svelte:head>
	<meta property="og:title" content="Twitch Logs" />
	<meta name="keywords" content="twitch, twitch logs, search twitch chat logs, find chat history, twitch tools, chat messages, twitch channels" />
	<meta name="description" content="View chat logs in any Twitch channel." />
	<meta property="og:description" content="View chat logs in any Twitch channel." />
</svelte:head>

<svelte:window on:keydown={windowKeydown} />

<svelte:document bind:activeElement />

<div id="main-fit-screen" class="hidden"></div>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:overflow-y-visible">
	<header class="flex flex-wrap items-baseline gap-x-3">
		<h1 class="font-display text-3xl font-bold tracking-tight">Logs</h1>
		{#if channelsCount}
			<p class="text-dim text-base">
				<span class="tnum font-display text-text font-semibold">{compactNumber(channelsCount)}</span> channels indexed
			</p>
		{/if}
	</header>

	<form class="flex flex-wrap items-end gap-2" onsubmit={formSubmit}>
		<div class="relative flex flex-col gap-1">
			<Label for="input-channel">Channel <span class="text-accent">required</span></Label>
			<Input
				id="input-channel"
				class={showAutocomplete ? "w-44 rounded-b-none" : "w-44"}
				maxlength={25}
				bind:ref={channelInput}
				bind:value={inputChannelName}
				placeholder="Channel or id:123"
				onkeydown={channelKeydown}
				oninput={() => (channelTyped = true)}
				autocomplete="off"
				autofocus
			/>

			{#if showAutocomplete}
				<!-- one shell with the field: flush under it, squared at the join and carrying the same accent border, so the pair reads as one outline -->
				<Panel class="border-accent absolute top-full right-0 left-0 z-20 overflow-hidden rounded-t-none rounded-b-md border-t-0 p-1 shadow-lg">
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					{#each foundChannels as c, index (c.name)}
						<div
							class={["flex h-9 cursor-pointer items-center rounded-[5px] px-2 text-base transition-colors", index === selectedIndex ? "bg-raised text-text" : "text-dim"]}
							onmouseenter={() => (selectedIndex = index)}
							onmousedown={() => selectResult(index)}
						>
							{c.name}
						</div>
					{/each}
				</Panel>
			{/if}
		</div>

		<div class="flex flex-col gap-1">
			<Label for="input-user"
				>User {#if inputQuery.trim()}<span class="text-accent">required</span>{/if}</Label
			>
			<Input id="input-user" class="w-44" maxlength={25} bind:value={inputUserName} placeholder="Username or id:123" />
		</div>

		<div class="flex flex-col gap-1">
			<Label for="input-query">Query</Label>
			<Input id="input-query" class="w-44" maxlength={500} bind:value={inputQuery} placeholder="Search messages" autocomplete="off" />
		</div>

		<Button type="submit" variant="accent" disabled={loading}>
			{#if loading}
				<LoaderCircleIcon class="animate-spin" />
			{/if}
			Load
		</Button>

		{#if chatLogs.length}
			<Popover bind:open={statsPopoverOpen} align="end" class="w-80 max-w-[90vw] p-4">
				{#snippet trigger({ props })}
					<Button {...props} variant="outline" class="ml-auto" title="Channel stats">
						<ChartColumnIcon />
						<span class="hidden md:inline">Stats</span>
					</Button>
				{/snippet}

				{#if statsError}
					<p class="text-warn text-sm">{statsError}</p>
				{:else}
					<div class="space-y-4">
						<div>
							<h3 class="font-display text-dim text-sm font-medium tracking-wide">
								Messages{#if userName}&nbsp;by {channelStats?.userLogin || userName}{/if}
							</h3>
							{#if channelStats}
								<p class="tnum font-display text-accent mt-0.5 text-3xl font-bold">{channelStats.messageCount.toLocaleString()}</p>
							{:else}
								<Skeleton class="mt-1 h-8 w-28" />
							{/if}
						</div>

						{#if !userName}
							<div>
								<h3 class="font-display text-dim mb-1.5 text-sm font-medium tracking-wide">Top chatters</h3>
								<ol class="space-y-1">
									{#if channelStats?.topChatters}
										{#each channelStats.topChatters as chatter, index (chatter.userId)}
											<li class="border-line flex items-center justify-between gap-2 border-b pb-1 text-sm text-nowrap last:border-0">
												<span class="flex min-w-0 items-center gap-2">
													<span class="tnum text-dim w-5 text-right text-sm">{index + 1}</span>
													<span class="truncate" title={chatter.userLogin}>{chatter.userLogin || `id:${chatter.userId}`}</span>
												</span>
												<span class="tnum text-dim">{chatter.messageCount.toLocaleString()}</span>
											</li>
										{/each}
									{:else}
										{#each { length: 5 }}
											<Skeleton class="h-6 w-full" />
										{/each}
									{/if}
								</ol>
							</div>
						{/if}
					</div>
				{/if}
			</Popover>
		{/if}
	</form>

	<div class="flex min-h-0 flex-1 flex-col gap-1.5">
		<div class="flex flex-wrap items-center gap-1.5">
			{#if dateContent}
				{#if dateContent.day}
					<Popover bind:open={datePopoverOpen}>
						{#snippet trigger({ props })}
							<Button {...props} variant="outline" size="sm" class="tnum w-36 justify-between" disabled={loading}>
								{dateContent.year}-{String(dateContent.month).padStart(2, "0")}-{String(dateContent.day).padStart(2, "0")}
								<CalendarIcon class="text-dim" />
							</Button>
						{/snippet}

						<Calendar
							type="single"
							months={monthOptions}
							years={yearOptions}
							isDateUnavailable={(date) => !isDateAvailable(date)}
							onPlaceholderChange={adjustDate}
							onValueChange={updateDateValue}
							bind:value={calendarDate}
						/>
					</Popover>
				{:else}
					<Select bind:open={datePopoverOpen} bind:value={dateValue} options={dateOptions} size="sm" disabled={loading} aria-label="Date" class="tnum w-36" contentClass="tnum" />
				{/if}
			{/if}

			{#if chatLogs.length}
				<div class="relative flex min-w-44 flex-1 items-center">
					<Input
						id="input-search"
						size="sm"
						class="pr-20"
						maxlength={500}
						placeholder={isJumpMode ? "Find..." : "Filter..."}
						autocomplete="off"
						bind:ref={searchInput}
						bind:value={searchValue}
					/>
					<span class="tnum text-dim pointer-events-none absolute right-2.5 text-xs select-none">{displayMessageCount}</span>
				</div>

				{#if isJumpSearching}
					{@const width = searchResults.length.toString().length + 4}
					<div class="flex items-center gap-1">
						<Input type="number" size="sm" class="tnum" bind:value={jumpInputValue} min={1} max={searchResults.length} style={`width: ${width}ch;`} />
						<span class="text-dim text-sm">of</span>
						<span class="tnum text-dim text-sm">{searchResults.length.toLocaleString()}</span>
					</div>
				{/if}

				<div class="ml-auto flex gap-1">
					<Button
						variant="outline"
						size="icon-sm"
						onclick={searchModeToggle}
						title={isJumpMode ? "Switch to filtering" : "Switch to jumping"}
						aria-label={isJumpMode ? "Switch to filtering" : "Switch to jumping"}
						aria-pressed={isJumpMode}
						class="on:border-accent on:text-accent"
					>
						{#if isJumpMode}
							<SearchIcon />
						{:else}
							<FilterIcon />
						{/if}
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						onclick={scrollFromBottomToggle}
						title={scrollFromBottom ? "Showing oldest first" : "Showing newest first"}
						aria-label={scrollFromBottom ? "Showing oldest first" : "Showing newest first"}
					>
						{#if scrollFromBottom}
							<ArrowUpNarrowWideIcon />
						{:else}
							<ArrowDownWideNarrowIcon />
						{/if}
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						title="Open raw logs"
						aria-label="Open raw logs"
						target="_blank"
						href="https://logs.zonian.dev/{parseChannelUser(channelName, userName, false)}/{dateContent
							? `${dateContent.year}/${dateContent.month}${dateContent.day ? `/${dateContent.day}` : ''}`
							: `search?q=${encodeURIComponent(query)}`}"
					>
						<FileTextIcon />
					</Button>
				</div>
			{/if}
		</div>

		{#if error}
			<p class="text-warn text-sm">{error}</p>
		{:else if chatLogs.length}
			<Panel class="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden leading-5 max-md:min-h-[60svh]">
				<VirtualList bind:this={logsList} itemCount={filteredChatLogs.length} itemSize={lineHeight} class="overflow-scroll overscroll-contain py-2">
					{#snippet item(index, style)}
						{@const msg = filteredChatLogs[index]}
						{@const msgId = getMessageId(msg)}
						{@const time = messageTime(msg)}
						{@const isNewDay = index > 0 && messageTime(filteredChatLogs[index - 1]).day !== time.day}
						{@const isHashMatch = msgId === page.url.hash.slice(1)}
						{@const isJumpMatch = isJumpSearching && !isHashMatch && jumpHighlights?.has(msgId)}
						{@const isHighlight = Boolean(msg.tags["system-msg"]) || msg.tags["bits"] || msg.tags["msg-id"] === "announcement"}
						<div class="group w-max min-w-full text-nowrap" {style}>
							<div
								class={[
									"flex h-5 w-full items-center gap-x-1 px-3",
									isNewDay && "border-line -mt-px border-t border-dashed",
									(isHashMatch && "bg-accent/25") || (isJumpMatch && "bg-accent/10") || (isHighlight && "bg-signal/15"),
								]}
							>
								<span class="tnum text-dim/80 shrink-0 text-xs select-none">{time.at}</span>
								<span class="h-5 w-max">
									{#if msg.tags["target-msg-id"]}
										{@const msgDeleted = messageById(msg.tags["target-msg-id"])}
										<span class="text-dim">
											{#if msgDeleted}
												<span class="cursor-help underline decoration-dotted" title="{msgDeleted.displayName}: {msgDeleted.text}">
													A message from {msgDeleted.displayName} was deleted
												</span>
											{:else}
												A message was deleted
											{/if}
										</span>
									{:else}
										<MessageContent {chat} {msg} />
									{/if}
								</span>
								{#if !isHashMatch}
									<Button
										variant="ghost"
										size="icon-sm"
										class="size-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
										title="Permalink"
										href="?c={channelName}&d={new Date(msg.timestamp).toISOString().slice(0, 10)}#{msgId}"
										target="_blank"
									>
										<ExternalLinkIcon />
									</Button>
								{/if}
							</div>
						</div>
					{/snippet}
				</VirtualList>
			</Panel>
		{/if}
	</div>
</div>
