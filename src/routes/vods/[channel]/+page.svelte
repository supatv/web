<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { page } from "$app/state";

    import { LoaderCircleIcon } from "lucide-svelte";

    import type { User, Stream } from "$lib/twitch/streams";

    import dayjs from "dayjs";
    import relativeTime from "dayjs/plugin/relativeTime";
    import duration from "dayjs/plugin/duration";
    dayjs.extend(relativeTime);
    dayjs.extend(duration);

    const formatDuration = (time: number, unit?: duration.DurationUnitType) => {
        const d = dayjs.duration(time, unit);

        const hours = Math.floor(d.asHours());
        const minutes = d.minutes().toString();
        const secs = d.seconds().toString().padStart(2, "0");

        return hours > 0 ? `${hours}:${minutes.padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
    };

    let user: User | null = $state(null);
    let streams: Stream[] | null = $state(null);

    const fetchStreams = async (userId: number) => {
        const res = await fetch(`https://api-tv.supa.sh/streams?user_id=${encodeURIComponent(userId)}`);
        streams = await res.json();
    };

    const fetchUser = async () => {
        const res = await fetch(`https://api-tv.supa.sh/user?login=${encodeURIComponent(page.params.channel)}`);
        user = await res.json();
        fetchStreams(user!.id);
    };
    fetchUser();

    let liveTicker = $state(0);
    let secInterval: number | NodeJS.Timeout | null = null;

    onMount(() => {
        secInterval = setInterval(() => {
            liveTicker++;
        }, 1000);
    });

    onDestroy(() => {
        if (secInterval) {
            clearTimeout(secInterval);
            secInterval = null;
        }
    });
</script>

{#if user === null}
    <div class="flex p-5 self-center">
        <LoaderCircleIcon class="animate-spin size-8" />
    </div>
{:else}
    <div class="flex flex-col p-5">
        <div class="flex flex-wrap items-center gap-3">
            <img src={user.avatar_url} alt="Avatar" class="size-28 rounded-full drop-shadow-md" />
            <span class="text-5xl drop-shadow">{user.display_name}</span>
        </div>

        <hr class="my-5" />
        {#if streams === null}
            <div class="flex self-center">
                <LoaderCircleIcon class="animate-spin size-8" />
            </div>
        {:else}
            <div class="self-center grid gap-5 max-w-[2500px] grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
                {#each streams as stream (stream.id)}
                    {@const createdAt = new Date(stream.created_at)}
                    {@const duration = stream.duration_ms}
                    <a href="/vods/{page.params.channel}/{stream.id.toString()}">
                        <div class="relative rounded-sm overflow-hidden">
                            <span class="text-xs absolute left-0 m-1 bg-black/50 text-white px-0.5 rounded-sm" title={createdAt.toLocaleString()}>
                                {dayjs(stream.created_at).fromNow()}
                            </span>
                            {#if stream.state === "RECORDING"}
                                <span class="text-xs absolute left-0 bottom-0 m-1 bg-black/50 text-white px-0.5 rounded-sm"> Recording...</span>
                            {/if}
                            <span class="text-xs absolute right-0 bottom-0 m-1 bg-black/50 text-white px-0.5 rounded-sm tabular-nums">
                                {#if duration === null}
                                    {#key liveTicker}
                                        {formatDuration(Date.now() - createdAt.getTime(), "ms")}
                                    {/key}
                                {:else}
                                    {formatDuration(duration, "ms")}
                                {/if}
                            </span>
                            <img src="https://r2-vods.supa.sh/{stream.id}/thumbnail.jpg" loading="lazy" alt="Thumbnail" class="aspect-video w-full" />
                        </div>
                        <p class="text-gray line-clamp-2" title={stream.title}>{stream.title}</p>
                    </a>
                {/each}
            </div>
        {/if}
    </div>
{/if}
