<script lang="ts">
    import fuzzysort from "fuzzysort";
    import dayjs from "dayjs";

    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Select from "$lib/components/ui/select/index.js";
    import * as Card from "$lib/components/ui/card/index.js";

    import VirtualList from "@/components/virtual-list.svelte";

    import { onMount, untrack } from "svelte";
    import Spinner from "@/components/spinner.svelte";

    type LogsDate = {
        year: string;
        month: string;
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

    let error: String | null = $state(null);
    let loading = $state(false);

    let channels: { name: string; userID: string }[] = $state([]);
    let searchTargets: Fuzzysort.Prepared[] = $state([]);
    let selectedIndex = $state(0); // Track selected item

    const loadChannels = async () => {
        error = null;
        loading = true;
        const res = await fetch("https://logs.zonian.dev/channels");
        if (~~(res.status / 100) !== 2) {
            error = `Error from server: ${res.status} ${res.statusText}`;
            loading = false;
            throw error;
        }

        const data = await res.json();
        channels = data.channels;
        searchTargets = channels.map((c) => c.name).map((str) => fuzzysort.prepare(str));
        loading = false;
    };

    onMount(() => {
        loadChannels();
    });

    let channelName = $state("");
    let userName = $state("");

    let searchResults = $derived(fuzzysort.go(channelName, searchTargets, { threshold: 0.5, limit: 5 }));
    $effect(() => {
        searchResults;
        selectedIndex = 0;
    });

    const channelKeydown = (event: KeyboardEvent) => {
        if (!searchResults.length || searchResults[0].target === channelName.toLowerCase()) return;

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                selectedIndex = (selectedIndex + 1) % searchResults.length;
                break;
            case "ArrowUp":
                event.preventDefault();
                selectedIndex = selectedIndex <= 0 ? searchResults.length - 1 : selectedIndex - 1;
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

    const formKeydown = (event: KeyboardEvent) => {
        // if (event.key !== "Enter") return;
        // event.preventDefault();
    };

    let availableLogs: LogsDate[] = $state([]);
    let chatLogs: Message[] = $state([]);
    let dateValue = $state("");

    const dateContent = $derived(availableLogs[Number(dateValue) ?? 0]);

    const listLogs = async (channel: string, user: string) => {
        const res = await fetch(`https://logs.zonian.dev/list?channel=${encodeURIComponent(channel)}&user=${encodeURIComponent(user)}`);
        if (~~(res.status / 100) !== 2) {
            if (res.status === 404) error = "No logs found for this channel and user";
            else error = `Error from server: ${res.status} ${res.statusText}`;

            loading = false;
            throw error;
        }

        const data: { availableLogs: LogsDate[] } = await res.json();
        return data;
    };

    const fetchLogs = async (channel: string, user: string, date: LogsDate) => {
        const res = await fetch(`https://logs.zonian.dev/channel/${encodeURIComponent(channel)}/user/${encodeURIComponent(user)}/${date.year}/${date.month}?jsonBasic=1&reverse=1`);
        if (~~(res.status / 100) !== 2) {
            error = `Error from server: ${res.status} ${res.statusText}`;
            loading = false;
            throw error;
        }

        const data: { messages: Message[] } = await res.json();
        return data;
    };

    const formSubmit = async (event: SubmitEvent) => {
        event.preventDefault();
        if (loading || !channelName || !userName) return;

        availableLogs = [];
        error = null;
        loading = true;
        const data = await listLogs(channelName, userName);
        availableLogs = data.availableLogs;
        loading = false;
    };

    function selectResult(index: number) {
        channelName = searchResults[index].target;
        selectedIndex = 0; // Reset selection after choosing
    }

    $effect(() => {
        if (!dateContent) return;
        untrack(async () => {
            error = null;
            loading = true;
            const data = await fetchLogs(channelName, userName, dateContent);
            chatLogs = data.messages;
            loading = false;
        });
    });
</script>

<div class="m-5 relative flex flex-col flex-1 h-full min-h-0">
    <h1 class="text-2xl font-bold mb-2">Search logs in {channels.length.toLocaleString()} channels</h1>
    <div class="flex flex-row my-3 justify-between min-h-0">
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <form class="flex relative gap-2 align-middle" onkeydown={formKeydown} onsubmit={formSubmit}>
            <div class="flex gap-2">
                <div class="flex flex-col w-1/2 relative">
                    <Label for="input-channel" class="text-base">Channel</Label>
                    <Input id="input-channel" maxlength={25} bind:value={channelName} placeholder="channel or id:123" onkeydown={channelKeydown} />

                    {#if searchResults.length && searchResults[0].target !== channelName.toLowerCase()}
                        <div class="absolute top-full left-0 right-0 z-10 mt-1">
                            <ScrollArea class="flex-1 rounded-md">
                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                {#each searchResults as c, index (c.target)}
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
                    <Input id="input-user" maxlength={25} bind:value={userName} placeholder="username or id:123" />
                </div>

                <div class="flex flex-col">
                    <Label for="load-btn" class="text-base invisible">Load</Label>
                    <Button type="submit" id="load-btn" class="sticky" disabled={loading}>Load</Button>
                </div>
            </div>
        </form>

        {#if dateContent}
            <div class="flex flex-col ml-4">
                <Label for="input-date" class="text-base">Date</Label>
                <Select.Root type="single" name="input-date" bind:value={dateValue}>
                    <Select.Trigger class="w-32">
                        {dateContent.year}/{String(dateContent.month).padStart(2, "0")}
                    </Select.Trigger>
                    <Select.Content>
                        <Select.Group>
                            {#each availableLogs as date, index}
                                {@const str = `${date.year}/${date.month.padStart(2, "0")}`}
                                <Select.Item class="font-mono" value={index.toString()} label={str} />
                            {/each}
                        </Select.Group>
                    </Select.Content>
                </Select.Root>
            </div>
        {/if}
    </div>

    {#if error}
        <p class="text-red-500">{error}</p>
    {:else if loading}
        <Spinner />
    {:else if chatLogs.length}
        <div class="flex flex-1 min-h-0 w-full">
            <Card.Root class="h-full w-full flex-col overflow-hidden p-3 leading-none">
                <VirtualList items={chatLogs} height="100%">
                    {#snippet children(data)}
                        <div class="flex flex-row gap-x-1 my-0.5">
                            <span class="font-mono text-neutral-500 text-nowrap text-xs mt-0.5">{dayjs(data.timestamp).format("YYYY-MM-DD HH:mm:ss")}</span>
                            <span style="color: {data.tags['color'] || 'gray'}" class="font-bold text-nowrap">{data.displayName}:</span>
                            <span style="word-break: break-word;">{data.text}</span>
                        </div>
                    {/snippet}
                </VirtualList>
            </Card.Root>
        </div>
    {/if}
</div>
