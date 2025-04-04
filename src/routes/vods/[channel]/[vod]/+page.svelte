<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import Hls from "hls.js";
	import { page } from "$app/state";

	let video: HTMLVideoElement;
	let hls: Hls;

	onMount(() => {
		if (!Hls.isSupported()) {
			throw new Error("HLS.js not supported");
		}

		hls = new Hls({
			startPosition: Number(page.url.searchParams.get("t")) || 0,
			fragLoadPolicy: {
				default: {
					maxTimeToFirstByteMs: 10000,
					maxLoadTimeMs: 120000,
					timeoutRetry: {
						maxNumRetry: 4,
						retryDelayMs: 0,
						maxRetryDelayMs: 0,
					},
					errorRetry: {
						maxNumRetry: Infinity,
						retryDelayMs: 3000,
						maxRetryDelayMs: 15000,
					},
				},
			},
		});
		hls.loadSource(`https://r2-vods.supa.sh/${page.params.vod}/master.m3u8`);
		hls.attachMedia(video);
	});

	onDestroy(() => {
		if (hls) hls.destroy();
	});
</script>

<div id="main-fit-screen" class="hidden"></div>

<div class="flex flex-1 items-center justify-center overflow-hidden">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video bind:this={video} controls autoplay class="h-full max-w-full"></video>
</div>
<p class="px-1 text-xs text-gray-500">Prototype &mdash; UI subject to change</p>
