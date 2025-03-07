<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";

    import type { TitleContext } from "$lib/common";

    import { LoaderCircleIcon, BadgeCheckIcon, UserIcon } from "lucide-svelte";

    import { onDestroy, onMount, getContext } from "svelte";

    getContext<TitleContext>("title").set("Livestreams");

    type Stream = {
        uid: string;
        login: string;
        name: string;
        started: string;
        viewers: number;
        game: string;
        title: string;
        avatar: string;
        type: string;
    };

    const formatUptime = (s: string) => {
        let string = "";
        const date = Date.parse(s);
        const t = Date.now() - date;

        const seconds = Math.floor(t / 1000);
        const hours = Math.floor(seconds / (60 * 60));
        const minutes = Math.floor(seconds / 60 - hours * 60);

        if (hours) string += `${hours}h`;
        if (minutes) string += `${minutes}m`;
        return string;
    };

    let fetchTimeout: number | NodeJS.Timeout | null = null;

    let streams: Stream[] | null = null;
    const fetchStreams = async () => {
        const res = await fetch("https://tv.supa.sh/tags/ro");
        streams = await res.json();
        fetchTimeout = setTimeout(() => {
            fetchStreams();
        }, 60_000);
    };

    onMount(() => {
        fetchStreams();
    });

    onDestroy(() => {
        if (fetchTimeout) {
            clearTimeout(fetchTimeout);
            fetchTimeout = null;
        }
    });
</script>

<div class="flex flex-col p-5 self-center">
    {#if streams === null}
        <LoaderCircleIcon class="animate-spin size-8" />
    {:else}
        <h1 class="text-2xl font-bold mb-2">
            Browse {streams.length.toLocaleString()} livestreams with {streams.reduce((sum, { viewers }) => sum + viewers, 0).toLocaleString()} viewers
        </h1>
        <div class="grid gap-5 max-w-[2500px] grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
            {#each streams as stream (stream.login)}
                <a href="https://www.twitch.tv/{stream.login}" target="_blank">
                    <Card.Root class="text-left p-1 hover:scale-105 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 transition">
                        <div class="max-w-full">
                            <div class="relative rounded-sm overflow-hidden">
                                <span class="text-xs absolute right-0 bg-black/60 text-white px-0.5 rounded-bl-sm">{formatUptime(stream.started)}</span>
                                <img
                                    src="https://static-cdn.jtvnw.net/previews-ttv/live_user_{stream.login}-600x338.jpg?t={~~(Date.now() / 1000 / 120)}"
                                    loading="lazy"
                                    alt="Thumbnail"
                                    class="aspect-video w-full stream-preview"
                                />
                            </div>

                            <div class="flex h-12 items-center mt-0 mx-1">
                                <img src={stream.avatar} loading="lazy" alt="Avatar" class="mr-1 rounded-full size-10 text-[0]" />

                                <div class="flex flex-1 overflow-hidden leading-tight items-center h-full">
                                    <div class="flex-1 min-w-[50%] overflow-hidden">
                                        <p class="font-semibold gap-0.5 flex items-center" title={stream.name}>
                                            {stream.name}
                                            {#if stream.type == "partner"}
                                                <BadgeCheckIcon class="inline size-4 text-purple-500 dark:text-purple-300" />
                                            {/if}
                                        </p>
                                        <p class="text-purple-500 dark:text-purple-300 capitalize text-sm">{stream.type}</p>
                                    </div>

                                    <div class="text-right overflow-hidden">
                                        <div class="flex justify-end items-center text-red-500 dark:text-red-300 font-semibold">
                                            <UserIcon class="size-5" />
                                            <span>{stream.viewers.toLocaleString()}</span>
                                        </div>
                                        <p class="text-sm opacity-80 whitespace-nowrap overflow-hidden text-ellipsis" title={stream.game}>{stream.game}</p>
                                    </div>
                                </div>
                            </div>
                            <p class="text-center whitespace-nowrap overflow-hidden text-ellipsis" title={stream.title}>{stream.title}</p>
                        </div>
                    </Card.Root>
                </a>
            {/each}
        </div>
    {/if}
</div>

<style>
    .stream-preview {
        background-image: url("https://static-cdn.jtvnw.net/ttv-static/404_preview-350x197.jpg");
        background-size: cover;
    }
</style>
