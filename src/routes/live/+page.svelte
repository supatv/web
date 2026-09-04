<script lang="ts">
	import { browser } from "$app/environment";

	import { Button, Checkbox, Dialog, Label, Skeleton } from "$lib/components/ui";

	import type { TitleContext } from "$lib/common";
	import type { Stream } from "$lib/twitch/livestreams";

	import { onMount, getContext } from "svelte";
	import StreamCard from "$lib/components/live/stream-card.svelte";

	import { playerMuted, gridCols } from "$lib/stores/live";

	import { ChevronsDownIcon, RefreshCwIcon } from "@lucide/svelte";

	import catPeek from "$lib/assets/images/cat-peek.png";

	getContext<TitleContext>("title").set("Livestreams");

	let windowScrollY: number = $state(0);

	let showKick = $state(browser && localStorage.getItem("live-show-kick") === "true");
	let kickConsent = $state(browser && localStorage.getItem("live-kick-consent") === "true");
	$effect(() => window.localStorage.setItem("live-show-kick", showKick.toString()));
	$effect(() => window.localStorage.setItem("live-kick-consent", kickConsent.toString()));

	let loading = $state(false);
	let lastRefresh = $state(0);
	let isKickDialogOpen = $state(false);

	let ogStreams: Stream[] = $state([]);
	const fetchStreams = async () => {
		loading = true;
		lastRefresh = Date.now();
		const t1 = Date.now();
		const res = await fetch("https://api-tv.supa.sh/tags/ro");
		ogStreams = await res.json();
		const t2 = Date.now();
		setTimeout(() => (loading = false), t1 - t2 < 500 ? 500 - (t2 - t1) : 0);
	};

	let streams = $derived(showKick ? ogStreams : ogStreams.filter((s) => s.platform === "twitch"));

	const windowKeydown = (event: KeyboardEvent) => {
		if (event.altKey || event.ctrlKey) return;
		if (event.key === "m") {
			playerMuted.update((v) => !v);
		} else if (event.key === "r") {
			if (!loading) fetchStreams();
		}
	};

	onMount(() => {
		fetchStreams();
	});
</script>

<svelte:head>
	<meta property="og:title" content="Twitch Romanian Livestreams" />
	<meta name="keywords" content="twitch, kick, twitch tools, twitch romania, kick romania, livestreams, live channels directory, twitch chat" />
	<meta name="description" content="Browse Romanian livestreams from Twitch and Kick." />
	<meta property="og:description" content="Browse Romanian livestreams from Twitch and Kick." />
</svelte:head>

<svelte:window on:keydown={windowKeydown} bind:scrollY={windowScrollY} />

<button
	class="border-line bg-surface text-dim hover:text-accent hover:border-accent ring-focus fixed right-5 bottom-5 z-30 grid size-12 place-items-center rounded-full border shadow-lg transition-colors"
	aria-disabled={loading}
	title={loading ? "Refreshing" : "Scroll, or right-click to refresh"}
	oncontextmenu={(e) => e.preventDefault()}
	onmouseup={(e) => {
		if (loading) return;
		if (e.button === 2) fetchStreams();
	}}
	onclick={() => {
		if (loading) return;

		window.scrollTo({ top: windowScrollY > 100 ? 0 : document.body.scrollHeight, behavior: "smooth" });
	}}
>
	{#if loading}
		<RefreshCwIcon class="size-5.5 animate-spin" />
	{:else}
		<ChevronsDownIcon class={["size-5.5 transition-transform", windowScrollY > 100 && "rotate-180"]} />
	{/if}
</button>

<Dialog bind:open={isKickDialogOpen} title="Heads up before you continue" description="Kick moderates content differently than most streaming platforms.">
	<ul class="text-dim space-y-1.5 text-sm">
		<li>Streams may contain material some viewers find offensive.</li>
		<li>The platform has a known history of viewbotting, so viewer counts may not reflect a genuine audience.</li>
		<li>Kick content is not endorsed by or affiliated with supa.sh.</li>
	</ul>

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (isKickDialogOpen = false)}>Cancel</Button>
		<Button
			variant="accent"
			onclick={() => {
				kickConsent = true;
				showKick = true;
				isKickDialogOpen = false;
			}}
		>
			Show Kick streams
		</Button>
	{/snippet}
</Dialog>

<div class="flex w-full max-w-[2500px] flex-col gap-3 self-center p-4">
	<header class="flex flex-wrap items-baseline gap-x-3">
		<h1 class="font-display text-3xl font-bold tracking-tight">
			<span class="bg-linear-to-r from-[#0057b8] via-[#ffd200] to-[#e4002b] bg-clip-text text-transparent">Romanian</span> livestreams
		</h1>
		{#if streams.length}
			<p class="text-dim text-base">
				<span class="tnum font-display text-text font-semibold">{streams.length.toLocaleString()}</span> channels,
				<span class="tnum font-display text-signal font-semibold">{streams.reduce((sum, { viewers }) => sum + viewers, 0).toLocaleString()}</span> watching
			</p>
		{/if}
	</header>

	<div class="flex items-center gap-2">
		<Checkbox
			id="show-kick-checkbox"
			bind:checked={showKick}
			onCheckedChange={(checked) => {
				if (!kickConsent && checked) {
					showKick = false;
					isKickDialogOpen = true;
				}
			}}
		/>
		<Label for="show-kick-checkbox" class="cursor-pointer normal-case">Show Kick streams</Label>
	</div>

	<div
		class="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4"
		style={$gridCols ? `grid-template-columns: repeat(${$gridCols}, minmax(0, 1fr));` : ""}
	>
		{#if streams.length}
			{#each streams as stream (`${stream.platform}:${stream.uid}`)}
				<a href="https://{stream.platform === 'kick' ? 'kick.com' : 'www.twitch.tv'}/{stream.login}" target="_blank" rel="nofollow">
					<StreamCard {stream} {showKick} {lastRefresh} />
				</a>
			{/each}
		{:else}
			{#each { length: 30 }}
				<div>
					<Skeleton class="aspect-video w-full rounded-md" />
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

<img alt="cat peek" src={catPeek} class="mt-auto size-24 rotate-90" />
