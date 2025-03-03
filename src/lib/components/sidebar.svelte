<script lang="ts">
    import { TvIcon, ScrollIcon, GemIcon, BookUserIcon, HeartIcon, SparklesIcon, FilmIcon, ClapperboardIcon } from "lucide-svelte";

    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import { page } from "$app/state";
    import dayjs from "dayjs";
</script>

<Sidebar.Root>
    <Sidebar.Header class="items-center">
        <div class="flex items-center">
            <SparklesIcon class="absolute left-4" fill="#cba6f7" color="#cba6f7" />
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
                                    <TvIcon />
                                    <span>Livestreams</span>
                                </a>
                            {/snippet}
                        </Sidebar.MenuButton>
                    </Sidebar.MenuItem>

                    <Sidebar.MenuItem>
                        <Sidebar.MenuButton isActive={page.url.pathname === "/vods"}>
                            {#snippet child({ props })}
                                <a href="/vods" {...props}>
                                    <FilmIcon />
                                    <span>VODs</span>
                                </a>
                            {/snippet}
                        </Sidebar.MenuButton>
                    </Sidebar.MenuItem>

                    <Sidebar.MenuItem>
                        <Sidebar.MenuButton aria-disabled={true} isActive={page.url.pathname === "/clips"}>
                            {#snippet child({ props })}
                                <a href="/clips" {...props}>
                                    <ClapperboardIcon />
                                    <span>Clips</span>
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
                                    <ScrollIcon />
                                    <span>Logs</span>
                                </a>
                            {/snippet}
                        </Sidebar.MenuButton>
                    </Sidebar.MenuItem>

                    <Sidebar.MenuItem>
                        <Sidebar.MenuButton aria-disabled={true} isActive={page.url.pathname === "/roles"}>
                            {#snippet child({ props })}
                                <a href="/roles" {...props}>
                                    <GemIcon />
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
                                    <BookUserIcon />
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
            <a href="https://github.com/supatv/web/commit/{__COMMIT_HASH}" target="_blank">
                {dayjs(__BUILD_DATE).format("D MMM")}, commit <span class="font-mono">{__COMMIT_HASH.slice(0, 7)}</span>
            </a>
        </p>
        <p>
            not affiliated with Twitch or its creators
            <br />
            <a href="https://supa.sh" target="_blank">
                &copy; supa.codes {new Date().getFullYear()}
                <HeartIcon fill="#cba6f7" color="#cba6f7" class="inline size-4" />
            </a>
        </p>
    </Sidebar.Footer>
</Sidebar.Root>
