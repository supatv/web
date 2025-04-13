<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { mode } from "mode-watcher";
	import fuzzysort from "fuzzysort";
	import dayjs from "dayjs";
	import linkParser from "$lib/linkParser";

	import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
	import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
	import { Skeleton } from "$lib/components/ui/skeleton/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { cn } from "$lib/utils.js";

	import * as Calendar from "$lib/components/ui/calendar/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import * as Card from "$lib/components/ui/card/index.js";

	import VirtualList from "svelte-tiny-virtual-list";

	import TextFragment from "$lib/components/message/text-fragment.svelte";
	import Emote from "$lib/components/message/emote.svelte";
	import Link from "$lib/components/message/link.svelte";
	import Badge from "$lib/components/message/badge.svelte";

	import { getContext, onMount, tick, untrack, type Component } from "svelte";
	import { browser } from "$app/environment";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";

	import { LoaderCircleIcon, FileTextIcon, ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon, CalendarIcon } from "@lucide/svelte";

	import { dateTimeFormat, type TitleContext } from "$lib/common";

	import { CalendarDate, DateFormatter, getLocalTimeZone, today, type DateValue } from "@internationalized/date";

	import * as TwitchServices from "$lib/twitch/services/index.js";

	type LogsDate = {
		year: string;
		month: string;
		day?: string;
	};

	type Message = {
		text: string;
		displayName: string;
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

	getContext<TitleContext>("title").set("Logs");

	let error: string | null = $state(null);
	let loading = $state(false);

	let channels: { name: string; userID: string }[] = $state([]);
	let channelTargets: Fuzzysort.Prepared[] = $state([]);
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

	const isDateAvailable = (date: DateValue) => {
		return availableDates.some((d) => d.year === String(date.year) && d.month === String(date.month) && (!d.day || d.day === String(date.day)));
	};

	const loadChannels = async () => {
		error = null;
		// loading = true;
		const res = await fetch("https://logs.zonian.dev/channels");
		if (!res.ok) {
			// error = `Error from server: ${res.status} ${res.statusText}`;
			// loading = false;
			throw error;
		}

		const data = await res.json();
		channels = data.channels;
		channelTargets = channels.map(({ name }) => fuzzysort.prepare(name));
		// loading = false;
	};

	onMount(() => {
		loadChannels();
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
		goto(page.url.search, { replaceState: true, keepFocus: true });

		inputChannelName = channelName = q.get("c") || "";
		inputUserName = userName = q.get("u") || "";
		dateValue = q.get("d") || "";
		searchValue = q.get("s") || "";
	});

	let logsBoxHeight = $state(0);
	let inputChannelName = $state("");
	let channelName = $state("");
	let inputUserName = $state("");
	let userName = $state("");
	let searchInput: HTMLInputElement | null = $state(null);

	let scrollFromBottom = $state(browser && window.localStorage.getItem("logs-bottom-scroll-state") === "true" ? true : false);

	let channelId = $state("");

	// Emotes
	const channelEmotes = new Map<string, EmoteProps>();
	const globalEmotes = new Map<string, EmoteProps>();
	let emoteUpdates = $state(0);

	// Badges
	const channelBadges = new Map();
	const globalBadges = new Map();
	let badgeUpdates = $state(0);

	$effect(() => {
		const c = channelName;
		const u = userName;
		const d = dateValue;
		const s = searchValue;
		untrack(() => {
			const q = page.url.searchParams;

			if (c) q.set("c", c);

			if (u) q.set("u", u);
			else q.delete("u");

			if (d) q.set("d", d);
			else q.delete("d");

			if (s) q.set("s", s);
			else q.delete("s");

			goto(page.url.search, { replaceState: true, keepFocus: true });
		});
	});

	let foundChannels = $derived(fuzzysort.go(inputChannelName, channelTargets, { threshold: 0.5, limit: 5 }));
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		foundChannels;
		selectedIndex = 0;
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

	// const formKeydown = (event: KeyboardEvent) => {
	//     if (event.key !== "Enter") return;
	//     event.preventDefault();
	// };

	const windowKeydown = (event: KeyboardEvent) => {
		if (event.ctrlKey && event.key === "f") {
			searchInput?.focus();
			event.preventDefault();
		}
	};

	let chatLogs: Message[] = $state([]);

	let contentRef = $state<HTMLElement | null>(null);

	let searchValue = $state("");

	let scrollOffset: number | undefined = $state();

	let filteredChatLogs = $derived.by(() => {
		let logs = searchValue
			? fuzzysort
					.go(searchValue, chatLogs, { key: "text", threshold: 0.5, limit: 5000 })
					.map((x) => x.obj)
					.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
			: chatLogs;
		if (!scrollFromBottom) logs = logs.toReversed();
		return logs;
	});

	$effect(() => {
		const l = filteredChatLogs.length;
		untrack(async () => {
			scrollOffset = 0;
			if (scrollFromBottom) {
				await tick();
				const scrollHeight = l * 20;
				if (logsBoxHeight - 24 > scrollHeight) return;
				scrollOffset = scrollHeight;
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

	$effect(() => {
		// fetch logs
		const date = dateContent;
		if (!date) return;

		untrack(async () => {
			error = null;
			loading = true;

			const res = await fetch(`https://logs.zonian.dev/${parseChannelUser(channelName, userName, false)}/${date.year}/${date.month}${date.day ? `/${date.day}` : ""}?jsonBasic=1`);
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

	const formSubmit = async (event: SubmitEvent) => {
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
</script>

<svelte:head>
	<title>Twitch Logs</title>
	<meta name="description" content="View chat logs in any Twitch channel." />
</svelte:head>

<svelte:window on:keydown={windowKeydown} />

<div id="main-fit-screen" class="hidden"></div>

<div class="relative flex h-full min-h-0 flex-1 flex-col p-5">
	<h1 class="text-2xl font-bold">
		Search logs in
		{#if !channels.length}
			<Skeleton class="inline-block h-7 w-[4ch] align-middle" />
		{:else}
			{channels.length.toLocaleString()}
		{/if}
		channels
	</h1>
	<div class="my-4 flex min-h-0 flex-row justify-between">
		<form class="relative flex gap-2 align-middle" onsubmit={formSubmit}>
			<div class="flex gap-2">
				<div class="relative flex w-1/2 flex-col">
					<Label for="input-channel" class="text-base">
						Channel<span class="text-red-500">*</span>
					</Label>
					<Input id="input-channel" maxlength={25} bind:value={inputChannelName} placeholder="channel or id:123" onkeydown={channelKeydown} autofocus />

					{#if foundChannels.length && foundChannels[0].target !== inputChannelName.toLowerCase()}
						<div class="absolute left-0 right-0 top-full z-10 mt-1">
							<ScrollArea class="flex-1 rounded-md">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								{#each foundChannels as c, index (c.target)}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div
										class="flex h-8 items-center text-sm hover:cursor-pointer
                                        {index === selectedIndex ? 'bg-neutral-200 dark:bg-neutral-800' : 'bg-neutral-100 dark:bg-neutral-900'}"
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
				<Popover.Root>
					<Popover.Trigger
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
							isDateDisabled={(date) => !isDateAvailable(date)}
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
																class="select-none bg-opacity-10 [&[data-disabled]]:pointer-events-none [&[data-selected]]:pointer-events-none"
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
					<Select.Root type="single" name="input-date" bind:value={dateValue}>
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
					<Input id="input-search" maxlength={500} placeholder="Search" class="h-8" bind:ref={searchInput} bind:value={searchValue} />
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
			<Card.Root class="h-full w-full flex-col p-3 leading-none">
				<VirtualList height={logsBoxHeight - 24} itemCount={filteredChatLogs.length} itemSize={20} bind:scrollOffset>
					<div class="flex h-5 flex-row gap-x-1 text-nowrap" slot="item" let:index let:style {style}>
						{@const msg = filteredChatLogs[index]}
						<span class="text-xs tabular-nums text-neutral-500">{dayjs(msg.timestamp).format(dateTimeFormat)}</span>
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
				</VirtualList>
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
