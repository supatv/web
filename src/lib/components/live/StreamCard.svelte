<script lang="ts">
	import type { Stream } from "$lib/twitch/livestreams";

	import * as Card from "$lib/components/ui/card/index.js";
	import { BadgeCheckIcon, UserIcon } from "@lucide/svelte";
	import StreamPlayer from "./StreamPlayer.svelte";
	import Image from "../image.svelte";

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

	let { stream }: { stream: Stream } = $props();

	let focused = $state(false);
</script>

<Card.Root
	class="bg-neutral-50 p-1 text-left transition duration-200 hover:scale-[1.05] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
	onmouseenter={() => (focused = true)}
	onmouseleave={() => (focused = false)}
>
	<div class="max-w-full">
		<div class="relative aspect-video size-full overflow-hidden rounded-sm">
			<span class="absolute right-0 z-50 rounded-bl-sm bg-black/60 px-0.5 text-xs text-white">
				{formatUptime(stream.started)}
			</span>
			{#if focused}
				<StreamPlayer channelName={stream.login} />
			{/if}
			<Image src="https://static-cdn.jtvnw.net/previews-ttv/live_user_{stream.login}-600x338.jpg?t={~~(Date.now() / 1000 / 120)}" loading="lazy" alt="Thumbnail" class="aspect-video w-full" />
		</div>

		<div class="mx-1 mt-0 flex h-12 items-center">
			<Image src={stream.avatar} loading="lazy" alt="Avatar" class="mr-1 size-10 rounded-full text-[0]" />

			<div class="flex h-full flex-1 items-center overflow-hidden leading-tight">
				<div class="min-w-[50%] flex-1 overflow-hidden">
					<p class="flex items-center gap-0.5 font-semibold" title={stream.name}>
						{stream.name}
						{#if stream.type == "partner"}
							<BadgeCheckIcon class="inline size-4 text-purple-500 dark:text-purple-300" />
						{/if}
					</p>
					<p class="text-sm capitalize text-purple-500 dark:text-purple-300">{stream.type}</p>
				</div>

				<div class="overflow-hidden text-right">
					<div class="flex items-center justify-end font-semibold text-red-500 dark:text-red-300">
						<UserIcon class="size-5" />
						<span>{stream.viewers.toLocaleString()}</span>
					</div>
					<p class="overflow-hidden text-ellipsis whitespace-nowrap text-sm opacity-80" title={stream.game}>{stream.game}</p>
				</div>
			</div>
		</div>
		<p class="overflow-hidden text-ellipsis whitespace-nowrap text-center" title={stream.title}>{stream.title}</p>
	</div>
</Card.Root>

<style>
</style>
