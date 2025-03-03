<script lang="ts">
    import { onMount } from "svelte";
    import Hls from "hls.js";
    import { page } from "$app/state";

    let video: HTMLVideoElement;

    onMount(() => {
        if (!Hls.isSupported()) {
            throw new Error("HLS.js not supported");
        }

        const hls = new Hls({ startPosition: 0 });
        hls.loadSource(`https://r2-vods.supa.sh/${page.params.vod}/master.m3u8`);
        hls.attachMedia(video);
    });
</script>

<div id="main-fit-screen" class="hidden"></div>

<div class="flex flex-1 items-center justify-center overflow-hidden">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} controls class="h-full max-w-full"></video>
</div>
<p class="text-xs text-gray-500 px-1">Prototype &mdash; UI subject to change</p>
