<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";

    import Spinner from "@/components/spinner.svelte";

    import IconCheck from "lucide-svelte/icons/badge-check";
    import IconUser from "lucide-svelte/icons/user";

    import { onDestroy, onMount } from "svelte";

    let fetchInterval: number | null = null;

    let streams: { uid: string; login: string; name: string; started: string; viewers: number; game: string; title: string; avatar: string; type: string }[] | null = null;
    const fetchStreams = async () => {
        const res = await fetch("https://tv.supa.sh/tags/ro");
        streams = await res.json();
        fetchInterval = setTimeout(() => {
            fetchStreams();
        }, 60_000);
    };

    onMount(() => {
        fetchStreams();
    });

    onDestroy(() => {
        if (fetchInterval) {
            clearTimeout(fetchInterval);
            fetchInterval = null;
        }
    });
</script>

<div class="flex flex-col m-5 self-center">
    {#if streams === null}
        <Spinner />
    {:else}
        <h1 class="text-2xl font-bold mb-2">
            Browse {streams.length.toLocaleString()} livestreams with {streams.reduce((sum, { viewers }) => sum + viewers, 0).toLocaleString()} viewers
        </h1>
        <div class="grid gap-5 max-w-[2500px] grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
            {#each streams as stream (stream.login)}
                <a href="https://www.twitch.tv/{stream.login}" target="_blank">
                    <Card.Root class="text-left p-1 hover:scale-105 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 transition">
                        <div class="max-w-full">
                            <img src="https://static-cdn.jtvnw.net/previews-ttv/live_user_{stream.login}-600x338.jpg?t={~~(Date.now() / 1000 / 120)}" loading="lazy" alt="Thumbnail" class="rounded-sm aspect-video w-full _thumbnail" />
                            <div class="flex h-12 items-center mt-0 mx-1">
                                <img src={stream.avatar} loading="lazy" alt="Avatar" class="mr-1 rounded-full size-10 text-center" />

                                <div class="flex flex-1 overflow-hidden leading-tight items-center h-full">
                                    <div class="flex-1 min-w-[50%] overflow-hidden">
                                        <p class="font-semibold gap-0.5 flex items-center" title={stream.name}>
                                            {stream.name}
                                            {#if stream.type == "partner"}
                                                <IconCheck class="inline h-4 w-4 text-purple-500 dark:text-purple-300" />
                                            {/if}
                                        </p>
                                        <p class="text-purple-500 dark:text-purple-300 capitalize text-sm">{stream.type}</p>
                                    </div>

                                    <div class="text-right overflow-hidden">
                                        <div class="flex justify-end items-center text-red-500 dark:text-red-300 font-semibold">
                                            <IconUser class="h-5 w-5" />
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
    ._thumbnail {
        background-image: url("https://static-cdn.jtvnw.net/ttv-static/404_preview-350x197.jpg");
        background-size: cover;
    }
</style>
