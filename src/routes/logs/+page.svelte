<script lang="ts">
    import { Calendar as CalendarPrimitive } from "bits-ui";
    import fuzzysort from "fuzzysort";
    import dayjs from "dayjs";

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

    import { getContext, onMount, tick, untrack, type Component } from "svelte";
    import { browser } from "$app/environment";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";

    import { LoaderCircleIcon, FileTextIcon, ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon, CalendarIcon } from "@lucide/svelte";

    import { dateFormat, type TitleContext } from "$lib/common";

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

    getContext<TitleContext>("title").set("Logs");

    let error: string | null = $state(null);
    let loading = $state(false);

    let channels: { name: string; userID: string }[] = $state([]);
    let channelTargets: Fuzzysort.Prepared[] = $state([]);
    let selectedIndex = $state(0); // Track selected item

    let availableDates: LogsDate[] = $state([]);
    let calendarValue = $state<DateValue>();
    let dateValue = $state("");

    const currentDate = today(getLocalTimeZone());

    const monthFmt = new DateFormatter("en-US", {
        month: "long",
    });

    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const month = currentDate.set({ month: i + 1 });
        return {
            value: month.month,
            label: `${String(month.month).padStart(2, "0")} (${monthFmt.format(month.toDate(getLocalTimeZone()))})`,
        };
    });

    const yearOptions = $derived(
        Array.from(
            {
                length: new Date().getFullYear() - Number(availableDates.slice(-1)[0]?.year ?? 0) + 1,
            },
            (_, i) => ({
                label: String(Number(availableDates.slice(-1)[0]?.year ?? 0) + i),
                value: Number(availableDates.slice(-1)[0]?.year ?? 0) + i,
            }),
        ),
    );

    const defaultYear = $derived(calendarValue ? { value: calendarValue.year, label: String(calendarValue.year) } : undefined);

    const defaultMonth = $derived(
        calendarValue
            ? {
                  value: calendarValue.month,
                  label: monthFmt.format(calendarValue.toDate(getLocalTimeZone())),
              }
            : undefined,
    );

    const monthLabel = $derived(monthOptions.find((m) => m.value === defaultMonth?.value)?.label ?? "Select a month");

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
    let emoteUpdates = $state(0);
    const channelEmotes = new Map();
    const globalEmotes = new Map();

    $effect(() => {
        const c = channelName;
        const u = userName;
        const d = dateValue;
        const s = searchValue;
        untrack(() => {
            const q = page.url.searchParams;

            if (c) q.set("c", c);
            if (u) q.set("u", u);

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
                if (res.status === 404) error = "No logs found for this channel and user";
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
                error = `Error from server: ${res.status} ${res.statusText}`;
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
        if (dateValue) {
            const [year, month, day] = dateValue.split("-");
            calendarValue = new CalendarDate(parseInt(year), parseInt(month), parseInt(day));
        }
    });

    $effect(() => {
        if (calendarValue) {
            const year = calendarValue.year;
            const month = String(calendarValue.month).padStart(2, "0");
            const day = calendarValue.day ? String(calendarValue.day).padStart(2, "0") : undefined;
            dateValue = `${year}-${month}${day ? `-${day}` : ""}`;
        }
    });

    $effect(() => {
        // fetch channel emotes

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        channelId;
        untrack(async () => {
            channelEmotes.clear();
            emoteUpdates++;
            if (!channelId) return;

            const [stvEmotes, bttvEmotes, ffzEmotes] = (await Promise.allSettled([TwitchServices.SevenTV.getChannelEmotes(channelId), TwitchServices.BetterTTV.getChannelEmotes(channelId), TwitchServices.FrankerFaceZ.getChannelEmotes(channelId)])).map((p) => (p.status === "fulfilled" ? p.value : []));

            stvEmotes.forEach((emote) => {
                channelEmotes.set(emote.name, `https://cdn.7tv.app/emote/${emote.id}/1x.webp`);
            });

            bttvEmotes.forEach((emote) => {
                channelEmotes.set(emote.code, `https://cdn.betterttv.net/emote/${emote.id}/1x.webp`);
            });

            ffzEmotes.forEach((emote) => {
                channelEmotes.set(emote.name, `https://cdn.frankerfacez.com/emote/${emote.id}/1`);
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

    const fetchGlobalEmotes = async () => {
        const [stvEmotes, bttvEmotes, ffzEmotes] = (await Promise.allSettled([TwitchServices.SevenTV.getGlobalEmotes(), TwitchServices.BetterTTV.getGlobalEmotes(), TwitchServices.FrankerFaceZ.getGlobalEmotes()])).map((p) => (p.status === "fulfilled" ? p.value : []));

        stvEmotes.forEach((emote) => {
            globalEmotes.set(emote.name, `https://cdn.7tv.app/emote/${emote.id}/1x.webp`);
        });

        bttvEmotes.forEach((emote) => {
            globalEmotes.set(emote.code, `https://cdn.betterttv.net/emote/${emote.id}/1x.webp`);
        });

        ffzEmotes.forEach((emote) => {
            globalEmotes.set(emote.name, `https://cdn.frankerfacez.com/emote/${emote.id}/1`);
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
        const emoteUrl = channelEmotes.get(word) || globalEmotes.get(word);
        if (emoteUrl) {
            components.push({ type: Emote, props: { name: word, src: emoteUrl } });
            return;
        }

        try {
            const url = new URL(word);
            components.push({
                type: Link,
                props: { href: url.href, text: word },
            });
        } catch {
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

<div class="p-5 relative flex flex-col flex-1 h-full min-h-0">
    <h1 class="text-2xl font-bold">
        Search logs in
        {#if !channels.length}
            <Skeleton class="h-7 w-[4ch] inline-block align-middle" />
        {:else}
            {channels.length.toLocaleString()}
        {/if}
        channels
    </h1>
    <div class="flex flex-row my-4 justify-between min-h-0">
        <form class="flex relative gap-2 align-middle" onsubmit={formSubmit}>
            <div class="flex gap-2">
                <div class="flex flex-col w-1/2 relative">
                    <Label for="input-channel" class="text-base">Channel</Label>
                    <Input id="input-channel" maxlength={25} bind:value={inputChannelName} placeholder="channel or id:123" onkeydown={channelKeydown} autofocus />

                    {#if foundChannels.length && foundChannels[0].target !== inputChannelName.toLowerCase()}
                        <div class="absolute top-full left-0 right-0 z-10 mt-1">
                            <ScrollArea class="flex-1 rounded-md">
                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                {#each foundChannels as c, index (c.target)}
                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                    <div
                                        class="h-8 hover:cursor-pointer flex items-center text-sm
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

                <div class="flex flex-col w-1/2">
                    <Label for="input-user" class="text-base">User</Label>
                    <Input id="input-user" maxlength={25} bind:value={inputUserName} placeholder="username or id:123" />
                </div>

                <div class="flex flex-row self-end gap-1 items-center">
                    <Button type="submit" id="load-btn" class="sticky" disabled={loading}>Load</Button>
                    {#if loading}
                        <LoaderCircleIcon class="animate-spin size-8" />
                    {/if}
                </div>
            </div>
        </form>
    </div>

    <div class="flex flex-row flex-wrap-reverse gap-1 justify-between mb-1">
        {#if dateContent}
            {#if dateContent.day}
                <Popover.Root>
                    <Popover.Trigger
                        class={cn(
                            buttonVariants({
                                variant: "outline",
                                class: "hover:bg-transparent focus:ring-ring flex items-center justify-between rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 w-40 h-8",
                            }),
                        )}
                    >
                        {dateContent.year}-{String(dateContent.month).padStart(2, "0")}-{String(dateContent.day).padStart(2, "0")}
                        <CalendarIcon class="opacity-50" />
                    </Popover.Trigger>
                    <Popover.Content bind:ref={contentRef} class="w-auto p-0" align="start">
                        <CalendarPrimitive.Root type="single" weekdayFormat="short" class={cn("rounded-md border p-3")} bind:value={calendarValue} bind:placeholder={calendarValue} minValue={new CalendarDate(parseInt(availableDates.slice(-1)[0].year), parseInt(availableDates.slice(-1)[0].month), parseInt(availableDates.slice(-1)[0].day || "1"))} maxValue={currentDate}>
                            {#snippet children({ months, weekdays })}
                                <Calendar.Header class="flex w-full items-center justify-between gap-2">
                                    <Select.Root
                                        type="single"
                                        value={`${defaultYear?.value}`}
                                        onValueChange={(v) => {
                                            if (!v || !calendarValue) return;
                                            if (v === `${calendarValue?.year}`) return;
                                            calendarValue = calendarValue.set({ year: Number.parseInt(v) });
                                        }}
                                    >
                                        <Select.Trigger aria-label="Select year" class="h-8 w-[40%]">
                                            {defaultYear?.label ?? "Select year"}
                                        </Select.Trigger>
                                        <Select.Content class="max-h-[200px] overflow-y-auto">
                                            {#each yearOptions as { value, label } (value)}
                                                <Select.Item value={`${value}`} {label} />
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                    <Select.Root
                                        type="single"
                                        value={`${defaultMonth?.value}`}
                                        onValueChange={(v) => {
                                            if (!calendarValue) return;
                                            if (v === `${calendarValue.month}`) return;
                                            calendarValue = calendarValue.set({ month: Number.parseInt(v) });
                                        }}
                                    >
                                        <Select.Trigger aria-label="Select month" class="h-8 w-[60%]">
                                            {monthLabel}
                                        </Select.Trigger>
                                        <Select.Content class="max-h-[200px] overflow-y-auto">
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
                                                            <Calendar.Cell class="select-none" {date} month={month.value}>
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
                        <Select.Trigger class="w-40 h-8">
                            {dateContent.year}-{String(dateContent.month).padStart(2, "0")}{dateContent.day ? `-${String(dateContent.day).padStart(2, "0")}` : ""}
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Group>
                                {#each availableDates as date, index (index)}
                                    {#if index > 0 && date.year !== availableDates[index - 1].year}
                                        <Select.Separator class="mx-0" />
                                    {/if}
                                    {@const str = `${date.year}-${date.month.padStart(2, "0")}${date.day ? `-${date.day.padStart(2, "0")}` : ""}`}
                                    <Select.Item class="tabular-nums p-1 m-0 justify-center" value={str} label={str} />
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
                    <Button variant="ghost" size="icon" class="size-8 border" target="_blank" href="https://logs.zonian.dev/{parseChannelUser(channelName, userName, false)}/{dateContent.year}/{dateContent.month}{dateContent.day ? `/${dateContent.day}` : ''}">
                        <FileTextIcon />
                    </Button>
                </div>
            {/if}
        {/if}
    </div>

    {#if error}
        <p class="text-red-500">{error}</p>
    {:else if chatLogs.length}
        <div class="flex flex-1 min-h-0 w-full" bind:clientHeight={logsBoxHeight}>
            <Card.Root class="h-full w-full flex-col leading-none p-3">
                <VirtualList height={logsBoxHeight - 24} itemCount={filteredChatLogs.length} itemSize={20} bind:scrollOffset>
                    <div class="flex flex-row gap-x-1 h-5 text-nowrap" slot="item" let:index let:style {style}>
                        {@const msg = filteredChatLogs[index]}
                        <span class="tabular-nums text-neutral-500 text-xs">{dayjs(msg.timestamp).format(dateFormat)}</span>
                        <span class:hidden={msg.tags["target-user-id"]} style="color: hsl(from {msg.tags['color'] || 'gray'} h s 70%)" class="font-bold">{msg.displayName}:</span>
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
            @apply bg-foreground/50 rounded;
        }
    }
</style>
