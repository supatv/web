<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";

    import Spinner from "@/components/spinner.svelte";

    import IconCheck from "lucide-svelte/icons/badge-check";
    import IconUser from "lucide-svelte/icons/user";

    import { onMount } from "svelte";

    let streams: { uid: string; login: string; name: string; started: string; viewers: number; game: string; title: string; avatar: string; type: string }[] | null = null;
    const fetchStreams = async () => {
        const res = await fetch("https://tv.supa.sh/tags/ro");
        streams = await res.json();
        setTimeout(() => {
            fetchStreams();
        }, 60_000);
    };

    onMount(() => {
        fetchStreams();
    });
</script>

<div class="flex flex-col m-5 self-center">
    {#if !streams}
        <Spinner />
    {:else}
        <p class="text-2xl font-bold mb-2">Browse {streams.length} livestreams with {streams.reduce((sum, { viewers }) => sum + viewers, 0)} viewers</p>
        <div class="grid gap-5 max-w-[2500px] grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
            {#each streams as stream}
                <a href="https://www.twitch.tv/{stream.login}" target="_blank">
                    <Card.Root class="text-left p-1 hover:scale-105 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 transition">
                        <div class="max-w-full">
                            <img loading="lazy" src="https://static-cdn.jtvnw.net/previews-ttv/live_user_{stream.login}-600x338.jpg?t={Date.now()}" alt="Thumbnail" class="rounded-sm aspect-video w-full _thumbnail" />
                            <div class="flex h-12 items-center mt-0 mx-1">
                                <Avatar.Root class="mr-1">
                                    <Avatar.Image loading="lazy" src={stream.avatar} alt="@shadcn" />
                                    <Avatar.Fallback>Avatar</Avatar.Fallback>
                                </Avatar.Root>

                                <div class="flex flex-1 overflow-hidden leading-tight items-center h-full">
                                    <div class="flex-1 min-w-[50%] overflow-hidden">
                                        <p class="font-semibold gap-0.5 flex items-center">
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
                                            <span>{stream.viewers}</span>
                                        </div>
                                        <p class="text-sm opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">{stream.game}</p>
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
