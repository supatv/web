<script lang="ts">
    import { getContext } from "svelte";

    import { Skeleton } from "$lib/components/ui/skeleton/index.js";
    import { HardDriveIcon } from "lucide-svelte";

    import { humanFileSize, type TitleContext } from "$lib/common";
    import type { User, BucketUsage } from "$lib/twitch/streams";

    getContext<TitleContext>("title").set("VODs");

    let users: User[] | null = $state(null);
    let bucketUsage: BucketUsage | null = $state(null);

    const fetchUsers = async () => {
        const res = await fetch("https://api-tv.supa.sh/users");
        users = await res.json();
    };

    const fetchBucketUsage = async () => {
        const res = await fetch("https://api-tv.supa.sh/bucket_usage");
        bucketUsage = await res.json();
    };

    fetchUsers();
    fetchBucketUsage();
</script>

<div class="flex flex-1 flex-col p-5">
    <div class="mb-5">
        <h1 class="text-2xl font-bold">
            View archived VODs in
            {#if users === null}
                <Skeleton class="h-7 w-[2ch] inline-block align-middle" />
            {:else}
                {users.length}
            {/if}
            channels
        </h1>
        <p class="text-xs text-gray-500">All content remains the property of its respective owners. We do not claim any rights and will honor removal requests.</p>
    </div>

    <div class="flex flex-wrap gap-8">
        {#if users === null}
            {#each { length: 10 }}
                <div class="flex flex-col items-center w-32 p-2">
                    <div class="size-28 mb-2">
                        <Skeleton class="size-full rounded-full" />
                    </div>
                    <div class="w-24 h-5">
                        <Skeleton class="h-4" />
                    </div>
                </div>
            {/each}
        {:else}
            {#each users as user (user.id)}
                <a href="/vods/{user.login}">
                    <div class="flex flex-col items-center w-32 p-2 hover:scale-105 transition">
                        <img src={user.avatar_url} loading="lazy" alt="Avatar" class="size-28 rounded-full drop-shadow-md" />
                        <p class="text-lg">{user.display_name}</p>
                    </div>
                </a>
            {/each}
        {/if}
    </div>

    {#if bucketUsage}
        <div class="flex items-center whitespace-pre text-sm text-gray-500 mt-auto pt-2">
            <HardDriveIcon class="inline size-4" />
            Active content: {humanFileSize(bucketUsage.metadata_bytes + bucketUsage.payload_bytes)}
        </div>
    {/if}
</div>
