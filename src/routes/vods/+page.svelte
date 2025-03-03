<script lang="ts">
    import { LoaderCircleIcon } from "lucide-svelte";

    import type { User } from "$lib/twitch/streams";

    let users: User[] | null = null;

    const fetchUsers = async () => {
        const res = await fetch("https://api-tv.supa.sh/users");
        users = await res.json();
    };
    fetchUsers();
</script>

<div class="flex flex-col p-5">
    {#if users === null}
        <LoaderCircleIcon class="animate-spin size-8 self-center" />
    {:else}
        <div class="mb-5">
            <h1 class="text-2xl font-bold">View archived VODs in {users.length} channels</h1>
            <p class="text-xs text-gray-500">All content remains the property of its respective owners. We do not claim any rights and will honor removal requests.</p>
        </div>

        <div class="flex flex-wrap gap-8 h-full">
            {#each users as user (user.id)}
                <a href="/vods/{user.login}">
                    <div class="flex flex-col items-center w-32 p-2 hover:scale-105 transition">
                        <img src={user.avatar_url} loading="lazy" alt="Avatar" class="size-28 rounded-full drop-shadow-md" />
                        <p class="text-lg">{user.display_name}</p>
                    </div>
                </a>
            {/each}
        </div>
    {/if}
</div>
