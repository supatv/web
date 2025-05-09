<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import { Skeleton } from "$lib/components/ui/skeleton/index.js";

	import Image from "$lib/components/image.svelte";

	import type { TitleContext } from "$lib/common";

	import { BadgeCheckIcon, UserIcon } from "@lucide/svelte";

	import { onDestroy, onMount, getContext } from "svelte";

	getContext<TitleContext>("title").set("Livestreams");

	type Stream = {
		uid: string;
		login: string;
		name: string;
		started: string;
		viewers: number;
		game: string;
		title: string;
		avatar: string;
		type: string;
	};

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

	let fetchTimeout: number | NodeJS.Timeout | null = null;

	let streams: Stream[] | null = null;
	const fetchStreams = async () => {
		const res = await fetch("https://api-tv.supa.sh/tags/ro");
		streams = await res.json();
		fetchTimeout = setTimeout(() => {
			fetchStreams();
		}, 60_000);
	};

	onMount(() => {
		fetchStreams();
	});

	onDestroy(() => {
		if (fetchTimeout) {
			clearTimeout(fetchTimeout);
			fetchTimeout = null;
		}
	});
</script>

<svelte:head>
	<title>Twitch Romanian Livestreams</title>
	<meta name="description" content="Browse every Romanian Twitch livestream and channel." />
</svelte:head>

<div class="flex w-full max-w-[2500px] flex-col self-center p-5">
	{#if streams === null}
		<h1 class="mb-2 text-2xl font-bold">
			Browse
			<Skeleton class="inline-block h-7 w-[2ch] align-middle" />
			livestreams with
			<Skeleton class="inline-block h-7 w-[4ch] align-middle" />
			viewers
		</h1>
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
			{#each { length: 30 }}
				<Card.Root class="bg-neutral-50 p-1 dark:bg-neutral-900">
					<Skeleton class="aspect-video w-full rounded-sm" />
					<div class="mx-1 mt-0 flex h-12 items-center">
						<Skeleton class="size-10 min-w-10 rounded-full" />
						<div class="ml-1 flex-1">
							<Skeleton class="mb-1 h-5 max-w-32" />
							<Skeleton class="h-4 max-w-20" />
						</div>
						<div class="ml-2 flex flex-col">
							<Skeleton class="mb-1 h-5 w-16 self-end" />
							<Skeleton class="h-4 w-24" />
						</div>
					</div>
					<Skeleton class="mt-1 h-5 w-full" />
				</Card.Root>
			{/each}
		</div>
	{:else}
		<h1 class="mb-2 text-2xl font-bold">
			Browse {streams.length.toLocaleString()} livestreams with {streams.reduce((sum, { viewers }) => sum + viewers, 0).toLocaleString()} viewers
		</h1>
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
			{#each streams as stream (stream.login)}
				<a href="https://www.twitch.tv/{stream.login}" target="_blank">
					<Card.Root class="bg-neutral-50 p-1 text-left transition hover:scale-105 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800">
						<div class="max-w-full">
							<div class="relative overflow-hidden rounded-sm">
								<span class="absolute right-0 z-10 rounded-bl-sm bg-black/60 px-0.5 text-xs text-white">{formatUptime(stream.started)}</span>
								<Image
									src="https://static-cdn.jtvnw.net/previews-ttv/live_user_{stream.login}-600x338.jpg?t={~~(Date.now() / 1000 / 120)}"
									loading="lazy"
									alt="Thumbnail"
									class="stream-preview aspect-video w-full"
								/>
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
				</a>
			{/each}
		</div>
	{/if}
</div>
