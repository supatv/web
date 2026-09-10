<script lang="ts">
	import type { Stream } from "$lib/twitch/livestreams";

	import { gridCols, streamPlayToasted } from "$lib/stores/live";

	import { BadgeCheckIcon, DiamondIcon, UserIcon } from "@lucide/svelte";
	import StreamPlayer from "./stream-player.svelte";
	import Image from "../image.svelte";

	import { toast } from "svelte-sonner";

	import TwitchWordmark from "$lib/assets/logos/twitch_wordmark_purple.svg";
	import KickWordmark from "$lib/assets/logos/kick_wordmark_green.svg";

	const formatUptime = (s: string) => {
		let string = "";
		const date = Date.parse(s);
		const t = Date.now() - date;

		const seconds = Math.floor(t / 1000);
		const hours = Math.floor(seconds / (60 * 60));
		const minutes = Math.floor(seconds / 60 - hours * 60);

		if (hours) string += `${hours}h`;
		if (minutes) string += `${minutes}m`;
		return string;
	};

	let { stream, showKick, lastRefresh }: { stream: Stream; showKick: boolean; lastRefresh: number } = $props();

	let focused = $state(false);
	let active = $state(false);

	const uptime = $derived(formatUptime(stream.started));
</script>

<div
	onmouseenter={() => (focused = true)}
	onmouseleave={() => (focused = false)}
	role="link"
	tabindex="-1"
	class={[
		"bg-surface hover:border-accent/60 flex h-full flex-col overflow-hidden rounded-lg border border-transparent transition duration-150 hover:-translate-y-1",
		active && "border-accent ring-accent/40 ring-2",
	]}
>
	<div
		class="bg-raised relative aspect-video w-full"
		role="button"
		tabindex="-1"
		onmouseup={(e) => {
			if (e.button === 2) {
				active = !active;
				if (!$streamPlayToasted) {
					streamPlayToasted.set(true);
					toast.info("Right-clicking streams will let them play in the background", { duration: 8000 });
				}
			}
		}}
		oncontextmenu={(e) => e.preventDefault()}
	>
		{#if focused || active}
			<StreamPlayer channelName={stream.login} platform={stream.platform} />
		{/if}
		<Image
			src={(stream.thumbnail || `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.login}-${$gridCols && $gridCols < 4 ? "900x507" : "600x338"}.jpg`) + `?t=${lastRefresh}`}
			alt="Thumbnail"
			class="aspect-video w-full object-cover"
		/>

		<div class="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-1.5 p-1.5">
			{#if showKick}
				<div class="grid h-5 place-items-center rounded-md bg-black/60 px-1.5">
					{#if stream.platform === "kick"}
						<img src={KickWordmark} alt="Kick" class="h-2.5" />
					{:else}
						<img src={TwitchWordmark} alt="Twitch" class="h-2.5" />
					{/if}
				</div>
			{/if}

			{#if uptime}
				<span class="font-display ml-auto grid h-5 place-items-center rounded-md bg-black/60 px-1.5 text-xs font-semibold text-white tabular-nums">
					{uptime}
				</span>
			{/if}
		</div>
	</div>

	<div class="flex flex-1 gap-2 px-2 py-1">
		<Image src={stream.avatar} alt="Avatar" class="size-12 shrink-0 self-center rounded-sm text-[0]" />

		<div class="flex min-w-0 flex-1 flex-col">
			<div class="flex items-center gap-2">
				<div class="flex min-w-0 items-center gap-0.5">
					<span class="font-display truncate text-base font-semibold" title={stream.name}>{stream.name}</span>
					{#if stream.type === "partner"}
						<span title="Partner">
							<BadgeCheckIcon class="text-surface fill-accent size-5 min-w-5" />
						</span>
					{:else if stream.type === "affiliate"}
						<span title="Affiliate">
							<DiamondIcon class="fill-accent ml-0.5 size-3 min-w-3 text-transparent" />
						</span>
					{/if}
				</div>

				<div class="font-display text-signal ml-auto flex shrink-0 items-center gap-0.5 text-base font-semibold tabular-nums">
					<UserIcon class="size-3.5" />
					<span>{stream.viewers.toLocaleString()}</span>
				</div>
			</div>

			<p class="min-h-5 truncate text-sm" title={stream.title}>{stream.title}</p>

			<p class="text-dim min-h-4 truncate text-xs" title={stream.game}>{stream.game}</p>
		</div>
	</div>
</div>
