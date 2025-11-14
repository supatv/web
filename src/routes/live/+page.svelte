<script lang="ts">
	import { Skeleton } from "$lib/components/ui/skeleton/index.js";

	import type { TitleContext } from "$lib/common";
	import type { Stream } from "$lib/twitch/livestreams";

	import { onMount, getContext } from "svelte";
	import StreamCard from "$lib/components/live/stream-card.svelte";

	import { playerMuted, gridCols } from "$lib/stores/live";

	import { ChevronsDownIcon, RefreshCwIcon } from "@lucide/svelte";

	getContext<TitleContext>("title").set("Livestreams");

	let windowScrollY: number = $state(0);

	let loading = $state(false);
	let lastRefresh = $state(0);

	let streams: Stream[] | null = $state(null);
	const fetchStreams = async () => {
		loading = true;
		lastRefresh = Date.now();
		const t1 = Date.now();
		const res = await fetch("https://api-tv.supa.sh/tags/ro");
		streams = await res.json();
		const t2 = Date.now();
		setTimeout(() => (loading = false), t1 - t2 < 500 ? 500 - (t2 - t1) : 0);
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
</script>

<svelte:head>
	<title>Twitch Romanian Livestreams</title>
	<meta name="keywords" content="twitch, twitch tools, twitch romania, livestreams, live channels directory, twitch chat, viewers, followers" />
	<meta name="description" content="Browse every Romanian Twitch livestream and channel." />
</svelte:head>

<svelte:window on:keydown={windowKeydown} bind:scrollY={windowScrollY} />

<button
	class="fixed bottom-5 right-5 z-50 rounded-full bg-neutral-200 p-3 opacity-80 transition-opacity hover:opacity-100 dark:bg-neutral-900"
	aria-disabled={loading}
	oncontextmenu={(e) => e.preventDefault()}
	onmouseup={(e) => {
		if (loading) return;
		if (e.button === 2) return fetchStreams();
		if (e.button !== 0) return;

		window.scrollTo({ top: windowScrollY > 100 ? 0 : document.body.scrollHeight, behavior: "smooth" });
	}}
>
	{#if loading}
		<RefreshCwIcon size={32} class="animate-spin" />
	{:else}
		<ChevronsDownIcon size={32} class={["transition-all", windowScrollY > 100 && "rotate-180"]} />
	{/if}
</button>

<div class="flex w-full max-w-[2500px] flex-col self-center p-5">
	<div class="flex flex-wrap items-end">
		<h1 class="text-4xl font-bold">
			<span class="bg-gradient-to-r from-blue-700 via-yellow-300 to-red-600 bg-clip-text font-extrabold text-transparent">Romanian</span> Livestreams
		</h1>
		{#if streams !== null}
			<span class="ml-auto text-2xl font-light">
				<span class="font-normal">{streams.length.toLocaleString()}</span>
				channels with
				<span class="font-normal">{streams.reduce((sum, { viewers }) => sum + viewers, 0).toLocaleString()}</span>
				viewers
			</span>
		{/if}
	</div>

	<div
		class="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4"
		style={$gridCols ? `grid-template-columns: repeat(${$gridCols}, minmax(0, 1fr));` : ""}
	>
		{#if streams !== null}
			{#each streams as stream (stream.login)}
				<a href="https://www.twitch.tv/{stream.login}" target="_blank" rel="nofollow">
					<StreamCard {stream} {lastRefresh} />
				</a>
			{/each}
		{:else}
			{#each { length: 30 }}
				<div>
					<Skeleton class="aspect-video w-full rounded" />
					<div class="mt-1 flex flex-row">
						<Skeleton class="mr-1 size-12 rounded-full" />
						<div class="flex h-full flex-1 flex-col gap-0.5">
							<Skeleton class="h-5 max-w-32" />
							<Skeleton class="h-4 max-w-64" />
							<Skeleton class="h-4 max-w-24" />
						</div>
					</div>
				</div>
			{/each}
			<div style="height: 99999px;"></div>
		{/if}
	</div>
</div>

<div class="mt-24"></div>
