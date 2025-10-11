<script lang="ts">
	import type { Stream } from "$lib/twitch/livestreams";

	import { gridCols, streamPlayToasted } from "$lib/stores/live";

	import { BadgeCheckIcon, UserIcon } from "@lucide/svelte";
	import StreamPlayer from "./stream-player.svelte";
	import Image from "../image.svelte";

	import { toast } from "svelte-sonner";

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

	let { stream, lastRefresh }: { stream: Stream; lastRefresh: number } = $props();

	let focused = $state(false);
	let active = $state(false);
</script>

<div onmouseenter={() => (focused = true)} onmouseleave={() => (focused = false)} role="link" tabindex="-1" class="transition-transform hover:-translate-y-1">
	<div
		class={["relative aspect-video size-full overflow-hidden rounded transition", active && "ring-2 ring-ring"]}
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
		<span class="absolute right-0 top-0 z-30 m-1 rounded-sm bg-black/60 p-0.5 text-xs text-neutral-100">
			{formatUptime(stream.started)}
		</span>

		{#if focused || active}
			<StreamPlayer channelName={stream.login} />
		{/if}
		<Image
			src="https://static-cdn.jtvnw.net/previews-ttv/live_user_{stream.login}-{$gridCols && $gridCols < 4 ? '900x507' : '600x338'}.jpg?t={lastRefresh}"
			loading="lazy"
			alt="Thumbnail"
			class="aspect-video w-full"
		/>
	</div>

	<div class="mt-1 flex flex-row">
		<Image src={stream.avatar} loading="lazy" alt="Avatar" class="mr-1 size-12 rounded-full text-[0]" />

		<div class="flex h-full flex-1 flex-col overflow-hidden leading-tight">
			<div class="flex gap-2">
				<div class="flex items-center gap-0.5 overflow-hidden font-semibold" title={stream.name}>
					<span class="overflow-hidden">{stream.name}</span>
					{#if stream.type == "partner"}
						<BadgeCheckIcon class="size-4 min-w-4 text-purple-500 dark:text-purple-300" />
					{/if}
				</div>
				<div class="ml-auto flex items-center text-red-500 dark:text-red-400">
					<UserIcon class="size-4" />
					<span>{stream.viewers.toLocaleString()}</span>
				</div>
			</div>

			<!-- <p class="text-sm capitalize text-purple-500 dark:text-purple-300">{stream.type}</p> -->

			<p class="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm" title={stream.title}>{stream.title}</p>

			<p class="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-neutral-500" title={stream.game}>{stream.game}</p>
		</div>
	</div>
</div>

<style>
</style>
