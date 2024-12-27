<script lang="ts">
    import IconTv from "lucide-svelte/icons/tv";
    import IconScroll from "lucide-svelte/icons/scroll";
    import IconGem from "lucide-svelte/icons/gem";
    import IconBookUser from "lucide-svelte/icons/book-user";
    import IconHeart from "lucide-svelte/icons/heart";
    import IconSparkles from "lucide-svelte/icons/sparkles";

    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import { page } from "$app/state";
    import dayjs from "dayjs";
</script>

<Sidebar.Root>
    <Sidebar.Header class="items-center">
        <div class="flex items-center">
            <IconSparkles class="absolute left-4" fill="#cba6f7" color="#cba6f7" />
            <div class="flex flex-col my-2 leading-none">
                <span class="text-xs font-bold">tv.supa.sh</span>
                <h1 class="text-l">Twitch Utilities</h1>
            </div>
        </div>
    </Sidebar.Header>
    <Sidebar.Content>
        <Sidebar.Group>
            <Sidebar.GroupLabel>Romanian</Sidebar.GroupLabel>
            <Sidebar.GroupContent>
                <Sidebar.Menu>
                    <Sidebar.MenuItem>
                        <Sidebar.MenuButton isActive={page.url.pathname === "/live"}>
                            {#snippet child({ props })}
                                <a href="/live" {...props}>
                                    <IconTv />
                                    <span>Directory</span>
                                </a>
                            {/snippet}
                        </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                </Sidebar.Menu>
            </Sidebar.GroupContent>
        </Sidebar.Group>

        <Sidebar.Group>
            <Sidebar.GroupLabel>Chat</Sidebar.GroupLabel>
            <Sidebar.GroupContent>
                <Sidebar.Menu>
                    <Sidebar.MenuItem>
                        <Sidebar.MenuButton isActive={page.url.pathname === "/logs"}>
                            {#snippet child({ props })}
                                <a href="/logs" {...props}>
                                    <IconScroll />
                                    <span>Logs</span>
                                </a>
                            {/snippet}
                        </Sidebar.MenuButton>
                    </Sidebar.MenuItem>

                    <Sidebar.MenuItem>
                        <Sidebar.MenuButton aria-disabled={true} isActive={page.url.pathname === "/roles"}>
                            {#snippet child({ props })}
                                <a href="/roles" {...props}>
                                    <IconGem />
                                    <span>Roles</span>
                                </a>
                            {/snippet}
                        </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                </Sidebar.Menu>
            </Sidebar.GroupContent>
        </Sidebar.Group>

        <Sidebar.Group>
            <Sidebar.GroupLabel>Miscellaneous</Sidebar.GroupLabel>
            <Sidebar.GroupContent>
                <Sidebar.Menu>
                    <Sidebar.MenuItem>
                        <Sidebar.MenuButton aria-disabled={true} isActive={page.url.pathname === "/follows"}>
                            {#snippet child({ props })}
                                <a href="/follows" {...props}>
                                    <IconBookUser />
                                    <span>Following</span>
                                </a>
                            {/snippet}
                        </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                </Sidebar.Menu>
            </Sidebar.GroupContent>
        </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer class="text-xs opacity-60">
        <p class="text-[0.7rem]">
            {dayjs(__BUILD_DATE).format("D MMM")}, beta build
            <span class="font-mono">{__COMMIT_HASH.slice(0, 7)}</span>
        </p>
        <p>
            not affiliated with Twitch Interactive Inc,
            <br />
            <a href="https://supa.sh" target="_blank">
                &copy; supa.codes {new Date().getFullYear()}
                <IconHeart fill="#cba6f7" color="#cba6f7" class="inline size-4" />
            </a>
        </p>
    </Sidebar.Footer>
</Sidebar.Root>
