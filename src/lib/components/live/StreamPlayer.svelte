<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import Hls from "hls.js";

	import { muted } from "$lib/stores/muted";

	import { LoaderCircleIcon } from "@lucide/svelte";

	const { channelName }: { channelName: string } = $props();

	let video: HTMLVideoElement;
	let hls: Hls;

	let loading = $state(true);

	onMount(() => {
		if (!Hls.isSupported()) {
			throw new Error("HLS.js not supported");
		}

		hls = new Hls({
			enableWorker: true,
			progressive: true,
			liveSyncDurationCount: 1,
			liveMaxLatencyDurationCount: 2,
			liveDurationInfinity: true,
			capLevelToPlayerSize: true,
			fetchSetup: (ctx, initParams) => {
				return new Request(ctx.url.includes("/playlist/") ? `https://y.supa.sh/?u=${encodeURIComponent(ctx.url)}` : ctx.url, initParams);
			},
		});
		hls.loadSource(`https://luminous.alienpls.org/live/${channelName}?allow_source=true&fast_bread=true&warp=true&platform=web`);
		hls.attachMedia(video);
	});

	onDestroy(() => {
		if (hls) hls.destroy();
	});
</script>

{#if loading}
	<div class="absolute z-20 justify-center">
		<LoaderCircleIcon class="size-8 animate-spin text-white drop-shadow-sm" />
	</div>
{/if}

<video
	bind:this={video}
	onplay={() => {
		loading = false;
	}}
	autoplay
	volume="0.5"
	muted={$muted}
	class="absolute z-10 aspect-video size-full"
></video>
