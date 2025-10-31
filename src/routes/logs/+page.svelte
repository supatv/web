<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { mode } from "mode-watcher";
	import dayjs from "dayjs";
	import linkParser from "$lib/link-parser";

	import LogsWorker from "$lib/workers/logs?worker";
	import { op } from "$lib/workers/common/logs";

	import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
	import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";

	import { cn } from "$lib/utils.js";
	import { CalendarDate, DateFormatter, getLocalTimeZone, today, type DateValue } from "@internationalized/date";

	import * as Calendar from "$lib/components/ui/calendar/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import * as Card from "$lib/components/ui/card/index.js";

	import FocusTrap from "$lib/components/focus-trap.svelte";

	import VirtualList from "svelte-tiny-virtual-list";

	import TextFragment from "$lib/components/message/text-fragment.svelte";
	import Emote from "$lib/components/message/emote.svelte";
	import Link from "$lib/components/message/link.svelte";
	import Badge from "$lib/components/message/badge.svelte";
	import Reply from "$lib/components/message/reply.svelte";

	import { getContext, onDestroy, onMount, tick, untrack } from "svelte";
	import { SvelteMap } from "svelte/reactivity";

	import { browser } from "$app/environment";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";

	import { LoaderCircleIcon, FileTextIcon, ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon, CalendarIcon, ExternalLinkIcon, FilterIcon, SearchIcon } from "@lucide/svelte";

	import { dateTimeFormat, type TitleContext } from "$lib/common";

	import type { EmoteProps, BadgeProps, Message, ChatComponents, TMIEmote } from "$lib/twitch/logs";
	import { messageSearch } from "$lib/twitch/logs";

	import * as TwitchServices from "$lib/twitch/services/index.js";

	type LogsDate = {
		year: string;
		month: string;
		day?: string;
	};

	getContext<TitleContext>("title").set("Logs");

	const lineHeight = 20;

	let error: string | null = $state(null);
	let loading = $state(false);

	let isPopoverOpen = $state(false);

	let selectedIndex = $state(0); // Track selected item

	let availableDates: LogsDate[] = $state([]);
	let calendarDate = $state<DateValue>();
	let dateValue = $state("");

	const currentDate = today(getLocalTimeZone());

	const monthFmt = new DateFormatter("en-US", {
		month: "long",
	});

	const availableYears = $derived(new Set(availableDates.map((date) => date.year)));
	const availableMonthsByYear = $derived(
		availableDates.reduce(
			(acc, date) => {
				if (!acc[date.year]) {
					acc[date.year] = new Set();
				}
				acc[date.year].add(date.month);
				return acc;
			},
			{} as Record<string, Set<string>>
		)
	);

	const monthOptions = $derived(
		calendarDate
			? Array.from(availableMonthsByYear[calendarDate.year] || [])
					.map((month) => {
						const monthNum = parseInt(month);
						const date = currentDate.set({ month: monthNum });
						return {
							value: monthNum,
							label: `${String(monthNum).padStart(2, "0")} (${monthFmt.format(date.toDate(getLocalTimeZone()))})`,
						};
					})
					.sort((a, b) => a.value - b.value)
			: []
	);

	const yearOptions = $derived(
		Array.from(availableYears)
			.map((year) => ({
				label: year,
				value: parseInt(year),
			}))
			.sort((a, b) => a.value - b.value)
	);

	const defaultYear = $derived(calendarDate ? { value: calendarDate.year, label: String(calendarDate.year) } : undefined);

	const defaultMonth = $derived(
		calendarDate
			? {
					value: calendarDate.month,
					label: monthFmt.format(calendarDate.toDate(getLocalTimeZone())),
				}
			: undefined
	);

	const monthLabel = $derived(monthOptions.find((m) => m.value === defaultMonth?.value)?.label ?? "Month");

	const availableDateSet = $derived(new Set(availableDates.map((d) => `${d.year}-${d.month}${d.day ? `-${d.day}` : ""}`)));

	const isDateAvailable = (date: DateValue) => {
		return availableDateSet.has(`${date.year}-${date.month}${date.day ? `-${date.day}` : ""}`);
	};

	let channelsCount = $state(0);
	let foundChannels: Fuzzysort.Result[] = $state([]);

	let logsWorker: Worker;
	const initLogsWorker = () => {
		logsWorker = new LogsWorker();
		logsWorker.postMessage({ op: op.READY });

		const handlers = {
			[op.CLIENT_DATA]: (payload: { channelsCount: number }) => {
				channelsCount = payload.channelsCount;
			},
			[op.CLIENT_SEARCH_RESULTS]: (payload: Fuzzysort.Result[]) => {
				foundChannels = payload;
				selectedIndex = 0;
			},
		};

		logsWorker.onmessage = (event) => {
			handlers[event.data.op]?.(event.data.payload);
		};

		$effect(() => {
			logsWorker.postMessage({ op: op.SEARCH, payload: inputChannelName });
		});
	};

	let isJumpMode = $state(false);
	onMount(() => {
		initLogsWorker();
		fetchGlobalBadges();
		fetchGlobalEmotes();

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
		dateValue = q.get("d") || "";
		searchValue = q.get("s") || "";
		isJumpMode = (q.get("sm") || window.localStorage.getItem("logs-search-mode")) === "jump";
	});

	onDestroy(() => {
		logsWorker?.terminate();
	});

	let logsBoxHeight = $state(0);
	let inputChannelName = $state("");
	let channelName = $state("");
	let inputUserName = $state("");
	let userName = $state("");
	let searchInput: HTMLInputElement | null = $state(null);

	let scrollFromBottom = $state(browser && window.localStorage.getItem("logs-bottom-scroll-state") === "true");

	let channelId = $state("");

	// Emotes
	const channelEmotes = new SvelteMap<string, EmoteProps>();
	const globalEmotes = new SvelteMap<string, EmoteProps>();
	let emoteUpdates = $state(0);

	// Badges
	const channelBadges = new SvelteMap<string, BadgeProps>();
	const globalBadges = new SvelteMap<string, BadgeProps>();
	let badgeUpdates = $state(0);

	$effect(() => {
		const c = channelName;
		const u = userName;
		const d = dateValue;
		const s = searchValue;
		const j = isJumpMode;
		const noJumpResults = chatLogs.length && !isJumpSearching;
		untrack(() => {
			const q = page.url.searchParams;

			let replaceState = true;

			if (!c) {
				q.delete("c");
			} else if (c !== q.get("c")) {
				q.set("c", c);
				replaceState = false;
			}

			if (!u) {
				q.delete("u");
			} else if (u !== q.get("u")) {
				q.set("u", u);
				replaceState = false;
			}

			if (!d) {
				q.delete("d");
			} else if (d !== q.get("d")) {
				q.set("d", d);
				replaceState = false;
			}

			if (s) {
				q.set("s", s);
				if (j) {
					q.set("sm", "jump");
					if (noJumpResults) replaceState = false;
				} else if (q.has("sm")) {
					q.delete("sm");
					replaceState = false;
				}
			} else if (q.has("s")) {
				q.delete("s");
				q.delete("sm");
				replaceState = false;
			}

			// TODO handle history state
			goto(page.url.search + (replaceState ? page.url.hash : ""), { replaceState: true, keepFocus: true });
		});
	});

	const channelKeydown = (event: KeyboardEvent) => {
		if (!foundChannels.length || foundChannels[0].target === inputChannelName.toLowerCase()) return;

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
		const isSearchFocused = searchInput === document.activeElement;
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

	let contentRef = $state<HTMLElement | null>(null);

	let searchValue = $state("");
	let searchResults = $derived(messageSearch(searchValue, chatLogs, scrollFromBottom));
	let filteredChatLogs = $derived(isJumpMode ? messageSearch("", chatLogs, scrollFromBottom) : searchResults);
	let isJumpSearching = $derived(isJumpMode && searchResults.length && searchValue);
	let jumpHighlights = $derived(isJumpSearching ? new Set(searchResults.map((m) => getMessageId(m))) : void 0);
	let jumpIndex = $derived(isJumpSearching ? searchResults.findIndex((m) => getMessageId(m) === page.url.hash.slice(1)) : -1);
	let jumpInputValue = $state(1);

	$effect(() => {
		if (!filteredChatLogs) return;
		untrack(async () => {
			await tick();
			const virtualList = document.querySelector(".virtual-list-wrapper");
			if (!virtualList) return;
			virtualList.scrollTop = scrollFromBottom ? virtualList.scrollHeight : 0;
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
		const msgIdx = chatLogs.findIndex((m) => getMessageId(m) === id);
		if (msgIdx === -1) return;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		scrollFromBottom;
		untrack(async () => {
			await tick();
			const virtualList = document.querySelector(".virtual-list-wrapper");
			if (!virtualList) return;

			const listHeight = virtualList.clientHeight;
			const totalHeight = virtualList.scrollHeight;

			if (scrollFromBottom) {
				virtualList.scrollTop = msgIdx * lineHeight - listHeight * 0.5 + lineHeight;
			} else {
				virtualList.scrollTop = totalHeight - msgIdx * lineHeight - listHeight * 0.5 - lineHeight;
			}
		});
	});

	// const dateContent = $derived(availableDates[Number(dateValue) ?? 0]);
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

	$effect(() => {
		// fetch available dates
		if (!channelName) return;
		untrack(async () => {
			availableDates = [];
			chatLogs = [];
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
		if (!date) return;

		untrack(async () => {
			error = null;
			loading = true;

			logsController?.abort();
			logsController = new AbortController();
			const res = await fetch(`https://logs.zonian.dev/${parseChannelUser(channelName, userName, false)}/${date.year}/${date.month}${date.day ? `/${date.day}` : ""}?jsonBasic=1`, {
				signal: logsController.signal,
			});
			if (!res.ok) {
				if (res.status === 404) error = "No logs found for this date";
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
		// fetch badges
		channelBadges.clear();
		untrack(() => badgeUpdates++);

		if (!channelId) return;

		untrack(async () => {
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
		});
	});

	const getBadges = (msg: Message) => {
		const badges: { id: string; src: string; title: string; alt: string }[] = [];

		const badgeList = msg.tags["badges"].split(",");
		for (const badge of badgeList) {
			const [id, version] = badge.split("/");
			const key = `${id}/${version}`;

			const channelBadge = channelBadges.get(key);
			if (channelBadge) {
				badges.push({
					id,
					src: channelBadge.url,
					title: channelBadge.title,
					alt: channelBadge.title,
				});
				continue;
			}

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

	const findClosestAvailableDate = (date: DateValue) => {
		const year = String(date.year);
		const month = String(date.month);

		const availableDays = availableDates
			.filter((d) => d.year === year && d.month === month)
			.map((d) => parseInt(d.day || "1"))
			.sort((a, b) => a - b);

		if (availableDays.length > 0) {
			const targetDay = date.day;
			const closestDay = availableDays.reduce((prev, curr) => {
				return Math.abs(curr - targetDay) < Math.abs(prev - targetDay) ? curr : prev;
			});

			return new CalendarDate(date.year, date.month, closestDay);
		}

		return null;
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

	$effect(() => {
		// fetch channel emotes
		channelEmotes.clear();
		untrack(() => emoteUpdates++);

		if (!channelId) return;

		untrack(async () => {
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
		});
	});

	const formSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		if (loading || !inputChannelName) return;

		// force reload
		channelName = "";
		userName = "";

		availableDates = [];
		dateValue = "";
		channelName = inputChannelName;
		userName = inputUserName;
	};

	const selectResult = (index: number) => {
		inputChannelName = foundChannels[index].target;
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

		if (msg.tags["reply-parent-msg-id"]) {
			const prefix = `@${msg.tags["reply-parent-user-login"]}`;
			components[0] = {
				type: Reply,
				props: {
					text: prefix,
					msgId: msg.tags["reply-parent-msg-id"],
					replyUser: msg.tags["reply-parent-user-login"],
					replyBody: msg.tags["reply-parent-msg-body"],
				},
			};
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
		} else {
			components.push({ type: TextFragment, props: { text: word } });
		}
	};

	const getMessageId = (msg: Message) => msg.id || msg.timestamp;
</script>

<svelte:head>
	<title>Twitch Logs</title>
	<meta name="keywords" content="twitch, twitch logs, search twitch chat logs, find chat history, twitch tools, chat messages, twitch channels" />
	<meta name="description" content="View chat logs in any Twitch channel." />
</svelte:head>

<svelte:window on:keydown={windowKeydown} />

<div id="main-fit-screen" class="hidden"></div>

<div class="relative flex h-full min-h-0 flex-1 flex-col p-5">
	<div class="flex flex-wrap items-end">
		<h1 class="text-4xl font-bold">Twitch Logs&nbsp;</h1>
		{#if channelsCount}
			<span class="text-xl font-light">for <span class="font-normal">{channelsCount.toLocaleString()}</span> channels</span>
		{/if}
	</div>

	<div class="my-2 flex min-h-0 flex-row justify-between">
		<form class="relative flex gap-2 align-middle" onsubmit={formSubmit}>
			<div class="flex gap-2">
				<div class="relative flex w-1/2 flex-col">
					<Label for="input-channel" class="text-base">
						Channel<span class="text-red-500">*</span>
					</Label>
					<Input id="input-channel" maxlength={25} bind:value={inputChannelName} placeholder="channel or id:123" onkeydown={channelKeydown} autocomplete="off" autofocus />

					{#if foundChannels.length && foundChannels[0].target !== inputChannelName.toLowerCase()}
						<div class="absolute left-0 right-0 top-full z-10 mt-1">
							<ScrollArea class="flex-1 rounded-md">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								{#each foundChannels as c, index (c.target)}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div
										class="flex h-8 items-center text-sm hover:cursor-pointer
                                        {index === selectedIndex ? 'bg-zinc-200 dark:bg-zinc-800' : 'bg-zinc-100 dark:bg-zinc-900'}"
										onmouseenter={() => (selectedIndex = index)}
										onclick={() => selectResult(index)}
									>
										<span class="mx-3">{c.target}</span>
									</div>
								{/each}
							</ScrollArea>
						</div>
					{/if}
				</div>

				<div class="flex w-1/2 flex-col">
					<Label for="input-user" class="text-base">User</Label>
					<Input id="input-user" maxlength={25} bind:value={inputUserName} placeholder="username or id:123" />
				</div>

				<div class="flex flex-row items-center gap-1 self-end">
					<Button type="submit" id="load-btn" class="sticky" disabled={loading}>Load</Button>
					{#if loading}
						<LoaderCircleIcon class="size-8 animate-spin" />
					{/if}
				</div>
			</div>
		</form>
	</div>

	<div class="mb-1 flex flex-row flex-wrap-reverse justify-between gap-1">
		{#if dateContent}
			{#if dateContent.day}
				<Popover.Root bind:open={isPopoverOpen}>
					<Popover.Trigger
						disabled={loading}
						class={cn(
							buttonVariants({
								variant: "outline",
								class: "flex h-8 w-36 items-center justify-between rounded-md border px-3 py-2 text-sm tabular-nums hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
							})
						)}
					>
						{dateContent.year}-{String(dateContent.month).padStart(2, "0")}-{String(dateContent.day).padStart(2, "0")}
						<CalendarIcon class="opacity-50" />
					</Popover.Trigger>

					<Popover.Content bind:ref={contentRef} class="w-auto p-0" align="start">
						<CalendarPrimitive.Root
							type="single"
							weekdayFormat="short"
							class="rounded-md border p-3 tabular-nums"
							onPlaceholderChange={(date) => adjustDate(date)}
							onValueChange={(date) => updateDateValue(date)}
							isDateUnavailable={(date) => !isDateAvailable(date)}
							bind:value={calendarDate}
						>
							{#snippet children({ months, weekdays })}
								<Calendar.Header class="flex w-full items-center justify-between gap-2">
									<Select.Root
										type="single"
										value={`${defaultYear?.value}`}
										onValueChange={(v) => {
											if (!v || !calendarDate) return;
											if (v === `${calendarDate?.year}`) return;
											calendarDate = calendarDate.set({ year: Number.parseInt(v) });
										}}
									>
										<Select.Trigger aria-label="Select year" class="h-8 max-w-24 tabular-nums">
											{defaultYear?.label ?? "Year"}
										</Select.Trigger>
										<Select.Content class="max-h-[200px] overflow-y-auto tabular-nums">
											{#each yearOptions as { value, label } (value)}
												<Select.Item value={`${value}`} {label} />
											{/each}
										</Select.Content>
									</Select.Root>
									<Select.Root
										type="single"
										value={`${defaultMonth?.value}`}
										onValueChange={(v) => {
											if (!calendarDate) return;
											if (v === `${calendarDate.month}`) return;
											calendarDate = calendarDate.set({ month: Number.parseInt(v) });
										}}
									>
										<Select.Trigger aria-label="Select month" class="h-8 w-full break-keep tabular-nums">
											{monthLabel}
										</Select.Trigger>
										<Select.Content class="max-h-[200px] overflow-y-auto tabular-nums">
											{#each monthOptions as { value, label } (value)}
												<Select.Item value={`${value}`} {label} />
											{/each}
										</Select.Content>
									</Select.Root>
								</Calendar.Header>
								<Calendar.Months>
									{#each months as month (month)}
										<Calendar.Grid>
											<Calendar.GridHead>
												<Calendar.GridRow class="flex">
													{#each weekdays as weekday (weekday)}
														<Calendar.HeadCell>
															{weekday.slice(0, 2)}
														</Calendar.HeadCell>
													{/each}
												</Calendar.GridRow>
											</Calendar.GridHead>
											<Calendar.GridBody>
												{#each month.weeks as weekDates (weekDates)}
													<Calendar.GridRow class="mt-2 w-full">
														{#each weekDates as date (date)}
															<Calendar.Cell
																class="select-none bg-opacity-10 [&[data-disabled]]:pointer-events-none [&[data-selected]]:pointer-events-none [&[data-unavailable]]:pointer-events-none [&[data-unavailable]]:opacity-50"
																{date}
																month={month.value}
															>
																<Calendar.Day />
															</Calendar.Cell>
														{/each}
													</Calendar.GridRow>
												{/each}
											</Calendar.GridBody>
										</Calendar.Grid>
									{/each}
								</Calendar.Months>
							{/snippet}
						</CalendarPrimitive.Root>
					</Popover.Content>
				</Popover.Root>
			{:else}
				<div class="flex flex-row">
					<Select.Root type="single" name="input-date" bind:open={isPopoverOpen} bind:value={dateValue} disabled={loading}>
						<Select.Trigger class="h-8 w-32 tabular-nums">
							{dateContent.year}-{String(dateContent.month).padStart(2, "0")}{dateContent.day ? `-${String(dateContent.day).padStart(2, "0")}` : ""}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each availableDates as date, index (index)}
									{#if index > 0 && date.year !== availableDates[index - 1].year}
										<Select.Separator class="mx-0" />
									{/if}
									{@const str = `${date.year}-${date.month.padStart(2, "0")}${date.day ? `-${date.day.padStart(2, "0")}` : ""}`}
									<Select.Item class="m-0 justify-center p-1 tabular-nums" value={str} label={str} />
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			{/if}
			{#if chatLogs.length}
				<div class="flex flex-1 gap-1">
					<form class="flex-1">
						<Input id="input-search" maxlength={500} placeholder="Search" class="h-8" autocomplete="off" bind:ref={searchInput} bind:value={searchValue} />
					</form>
					{#if isJumpSearching}
						{@const width = searchResults.length.toString().length + 5}
						<div class="flex items-center gap-1">
							<Input type="number" class="h-8 w-16 tabular-nums" bind:value={jumpInputValue} min={1} max={searchResults.length} style={`width: ${width}ch;`} />
							<span class="text-xs tabular-nums">/</span>
							<Input type="number" class="h-8 w-16 tabular-nums" value={searchResults.length} disabled style={`width: ${width}ch;`} />
						</div>
					{/if}
					<Button variant="ghost" size="icon" class="size-8 border" onclick={searchModeToggle} title="Toggle Search Mode" aria-label="Toggle Search Mode" aria-pressed={isJumpMode}>
						{#if !isJumpMode}
							<FilterIcon />
						{:else}
							<SearchIcon />
						{/if}
					</Button>
					<Button variant="ghost" size="icon" class="size-8 border" onclick={scrollFromBottomToggle}>
						{#if scrollFromBottom}
							<ArrowUpNarrowWideIcon />
						{:else}
							<ArrowDownWideNarrowIcon />
						{/if}
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="size-8 border"
						target="_blank"
						href="https://logs.zonian.dev/{parseChannelUser(channelName, userName, false)}/{dateContent.year}/{dateContent.month}{dateContent.day ? `/${dateContent.day}` : ''}"
					>
						<FileTextIcon />
					</Button>
				</div>
			{/if}
		{/if}
	</div>

	{#if error}
		<p class="text-red-500">{error}</p>
	{:else if chatLogs.length}
		<div class="flex min-h-0 w-full flex-1" bind:clientHeight={logsBoxHeight}>
			<Card.Root class="h-full w-full flex-col overflow-hidden leading-5">
				<VirtualList height={logsBoxHeight} itemCount={filteredChatLogs.length} itemSize={lineHeight}>
					<div class="group !w-auto min-w-full text-nowrap" slot="item" let:index let:style {style}>
						{@const msg = filteredChatLogs[index]}
						{@const msgid = getMessageId(msg)}
						{@const isHashMatch = msgid === page.url.hash.slice(1)}
						{@const isJumpMatch = isJumpSearching && !isHashMatch && jumpHighlights?.has(msgid)}
						{@const isHighlight = Boolean(msg.tags["system-msg"]) || msg.tags["bits"] || msg.tags["msg-id"] === "announcement"}
						<div
							class={[
								"flex h-5 w-full items-center gap-x-1 px-3",
								(isHashMatch && "bg-zinc-200 dark:bg-zinc-800") || (isJumpMatch && "bg-zinc-100 dark:bg-zinc-900") || (isHighlight && "bg-purple-600/30"),
							]}
						>
							<span class="select-none text-xs tabular-nums text-neutral-500">{dayjs(msg.timestamp).format(dateTimeFormat)}</span>
							{#if msg.tags["badges"]}
								<span class="inline-flex select-none gap-x-0.5 empty:hidden">
									{#key badgeUpdates}
										{#each getBadges(msg) as badge (badge.id)}
											<Badge src={badge.src} title={badge.title} alt="" />
										{/each}
									{/key}
								</span>
							{/if}
							<span class="h-5 w-max">
								{#if msg.tags["target-msg-id"]}
									{@const msgDeleted = chatLogs.find((m) => m.id === msg.tags["target-msg-id"])}
									<span class="text-neutral-500">
										{#if msgDeleted}
											<span class="cursor-help underline decoration-dotted" title="{msgDeleted.displayName}: {msgDeleted.text}">
												A message from {msgDeleted.displayName} was deleted
											</span>
										{:else}
											A message was deleted
										{/if}
									</span>
								{:else if msg.tags["target-user-id"] || !msg.displayName}
									<span class="text-neutral-500">
										{msg.text}
									</span>
								{:else}
									<span style="color: hsl(from {msg.tags['color'] || 'gray'} h s {$mode === 'light' ? '40%' : '70%'})" class="font-bold">
										{msg.displayName}:
									</span>
									<span>
										{#key emoteUpdates}
											{#each parseMessage(msg) as { type: Component, props }, index (index)}
												<Component {...props} />
											{/each}
										{/key}
									</span>
								{/if}
							</span>
							{#if msgid !== page.url.hash.slice(1)}
								<Button
									variant="outline"
									class="right-1 mx-1 size-5 self-center opacity-0 transition-opacity group-hover:opacity-100"
									href="?c={channelName}&d={new Date(msg.timestamp).toISOString().slice(0, 10)}#{msgid}"
									target="_blank"
								>
									<ExternalLinkIcon class="!size-3" />
								</Button>
							{/if}
						</div>
					</div>
				</VirtualList>
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
