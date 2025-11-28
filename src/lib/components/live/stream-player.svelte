<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import Hls from "hls.js";

	import { manifestMap } from "./playlist-cache";
	import { playerVol, playerMuted } from "$lib/stores/live";

	import { LoaderCircleIcon } from "@lucide/svelte";

	const { channelName }: { channelName: string } = $props();

	const playlistUrl = `https://luminous.alienpls.org/live/${channelName}?allow_source=true&fast_bread=true&warp=true&platform=web`;

	let video: HTMLVideoElement;
	let hls: Hls;

	let loading = $state(true);
	let needToInteract = $state(false);

	let attemptedErrorRecovery: null | number = null;

	class CustomPlaylistLoader extends Hls.DefaultConfig.loader {
		// @ts-expect-error ...
		load(context, config, callbacks) {
			const onSuccess = callbacks.onSuccess;

			// @ts-expect-error ...
			callbacks.onSuccess = (response, stats, context, networkDetails) => {
				if (context.type === "level") {
					if (response.data.includes("#EXT-X-MAP")) hls.config.progressive = false;
					else response.data = response.data.replace(/#EXT-X-TWITCH-PREFETCH:(.+)/g, "#EXTINF:2.0,\n$1");
				} else if (context.type === "manifest") {
					manifestMap.set(channelName, response.data);
				}

				onSuccess(response, stats, context, networkDetails);
			};

			if (context.url.includes("/playlist/")) {
				context.url = `https://y.supa.sh/?u=${encodeURIComponent(context.url)}`;
			}

			super.load(context, config, callbacks);
		}
	}

	onMount(() => {
		if (!Hls.isSupported()) {
			loading = false;
			throw new Error("HLS.js not supported");
		}

		hls = new Hls({
			enableWorker: true,
			progressive: true,
			liveSyncDurationCount: 1,
			liveMaxLatencyDurationCount: 2,
			liveDurationInfinity: true,
			capLevelToPlayerSize: true,
			// @ts-expect-error ...
			pLoader: CustomPlaylistLoader,
		});

		hls.on(Hls.Events.ERROR, (event, data) => {
			if (data.fatal) {
				if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
					const now = Date.now();
					if (!attemptedErrorRecovery || now - attemptedErrorRecovery > 5000) {
						console.log("Fatal media error encountered, attempting to recover", video.error);
						attemptedErrorRecovery = now;
						hls.recoverMediaError();
						return;
					}
				}

				if (manifestMap.has(channelName)) {
					manifestMap.delete(channelName);
					hls.loadSource(playlistUrl);
					return;
				}

				loading = false;
			}
		});

		hls.once(Hls.Events.BUFFER_CREATED, async () => {
			try {
				await video.play();
			} catch (e) {
				if (e instanceof Error && e.name === "NotAllowedError") {
					needToInteract = true;
					video.play();
				}
			}
		});

		const cache = manifestMap.get(channelName);
		if (cache) {
			const blob = new Blob([cache], { type: "application/vnd.apple.mpegurl" });
			hls.loadSource(URL.createObjectURL(blob));
		} else {
			hls.loadSource(playlistUrl);
		}

		hls.attachMedia(video);
	});

	onDestroy(() => {
		if (hls) hls.destroy();
	});
</script>

{#if needToInteract}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="absolute z-40 flex size-full items-center justify-center bg-black/60"
		role="button"
		tabindex="-1"
		onclick={(e) => {
			e.preventDefault();
			needToInteract = false;
			video.play();
		}}
	>
		<p class="font-semibold text-white">Click to unmute</p>
	</div>
{/if}

{#if loading}
	<div class="absolute z-20 m-1 justify-center rounded-full bg-black/60">
		<LoaderCircleIcon class="m-0.5 size-5 animate-spin text-white" />
	</div>
{/if}

<video
	bind:this={video}
	onplay={() => {
		loading = false;
	}}
	onerror={(event) => {
		const mediaError = (event.currentTarget as HTMLVideoElement).error;
		if (mediaError && mediaError.code === mediaError.MEDIA_ERR_DECODE) {
			const now = Date.now();
			if (!attemptedErrorRecovery || now - attemptedErrorRecovery > 5000) {
				attemptedErrorRecovery = now;
				hls?.recoverMediaError();
			}
		}
	}}
	autoplay
	volume={$playerVol}
	muted={$playerMuted || needToInteract}
	playsinline={true}
	class="absolute z-10 aspect-video size-full"
></video>
