<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import { Skeleton } from "$lib/components/ui/skeleton/index.js";

	import type { TitleContext } from "$lib/common";
	import type { Stream } from "$lib/twitch/livestreams";

	import { onDestroy, onMount, getContext } from "svelte";
	import StreamCard from "$lib/components/live/StreamCard.svelte";

	import { playerMuted, gridCols } from "$lib/stores/live";

	getContext<TitleContext>("title").set("Livestreams");

	let fetchTimeout: number | NodeJS.Timeout | null = null;

	let streams: Stream[] | null = $state(null);
	const fetchStreams = async () => {
		const res = await fetch("https://api-tv.supa.sh/tags/ro");
		streams = await res.json();
		// fetchTimeout = setTimeout(() => {
		// 	fetchStreams();
		// }, 60_000);
	};

	const windowKeydown = (event: KeyboardEvent) => {
		if (event.altKey || event.ctrlKey) return;
		if (event.key === "m") {
			playerMuted.update((v) => !v);
		}
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

<svelte:window on:keydown={windowKeydown} />

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
		<div style="height: 99999px;"></div>
	{:else}
		<h1 class="mb-2 text-2xl font-bold">
			Browse {streams.length.toLocaleString()} livestreams with {streams.reduce((sum, { viewers }) => sum + viewers, 0).toLocaleString()} viewers
		</h1>

		<div
			class="grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4"
			style={$gridCols ? `grid-template-columns: repeat(${$gridCols}, minmax(0, 1fr));` : ""}
		>
			{#each streams as stream (stream.login)}
				<a href="https://www.twitch.tv/{stream.login}" target="_blank">
					<StreamCard {stream} />
				</a>
			{/each}
		</div>
	{/if}
</div>
