<script lang="ts">
    import { getContext, onDestroy, onMount } from "svelte";
    import { page } from "$app/state";

    import { Skeleton } from "$lib/components/ui/skeleton/index.js";
    import { EyeOffIcon } from "lucide-svelte";

    import type { User, Stream } from "$lib/twitch/streams";
    import { dateFormat, type TitleContext } from "$lib/common";

    import dayjs from "dayjs";
    import relativeTime from "dayjs/plugin/relativeTime";
    import duration from "dayjs/plugin/duration";

    page.params.channel = page.params.channel.toLowerCase();

    const title = getContext<TitleContext>("title");

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
        title.set(`${user!.display_name}: VODs`);
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

<div class="flex flex-col p-5">
    {#if user === null}
        <div class="flex flex-wrap w-fit items-center justify-center gap-3">
            <Skeleton class="size-28 rounded-full" />
            <div class="flex flex-col gap-2">
                <Skeleton class="h-12 w-48" />
            </div>
        </div>
    {:else}
        <div class="flex flex-wrap w-fit items-center justify-center gap-3">
            <img src={user.avatar_url} alt="Avatar" class="size-28 rounded-full drop-shadow-md" />
            <div class="flex flex-col">
                <span class="drop-shadow text-3xl lg:text-5xl break-all">{user.display_name}</span>
                {#if user.unlisted}
                    <div class="mx-1">
                        <span class="flex items-center whitespace-pre text-sm text-gray-500">
                            <EyeOffIcon class="inline size-4" /> Unlisted
                        </span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <hr class="my-5" />
    <div class="self-center grid gap-5 w-full max-w-[2500px] grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
        {#if streams === null}
            {#each { length: 20 }}
                <div class="size-full">
                    <Skeleton class="aspect-video w-full rounded-sm" />
                    <div class="h-5 mt-1">
                        <Skeleton class="h-4 w-full" />
                    </div>
                </div>
            {/each}
        {:else}
            {#each streams as stream (stream.id)}
                {@const createdAt = new Date(stream.created_at)}
                {@const duration = stream.duration_ms}
                <a href="/vods/{page.params.channel}/{stream.id.toString()}">
                    <div class="relative rounded-sm overflow-hidden">
                        <span
                            class="text-xs absolute left-0 m-1 text-white px-0.5 rounded-sm
                                    {duration === null ? 'bg-red-600' : 'bg-black/60'}"
                            title={dayjs(createdAt).format(dateFormat)}
                        >
                            {duration === null ? "Live" : dayjs(stream.created_at).fromNow()}
                        </span>
                        {#if stream.state === "RECORDING"}
                            <span class="text-xs absolute left-0 bottom-0 m-1 bg-black/60 text-white px-0.5 rounded-sm">Recording...</span>
                        {/if}
                        <span class="text-xs absolute right-0 bottom-0 m-1 bg-black/60 text-white px-0.5 rounded-sm tabular-nums">
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
        {/if}
    </div>
</div>
