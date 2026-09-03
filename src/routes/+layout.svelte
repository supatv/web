<script lang="ts">
	import "@fontsource-variable/inter";
	import "@fontsource-variable/space-grotesk";
	import "../app.css";

	import { setContext } from "svelte";
	import { ModeWatcher, toggleMode, mode } from "mode-watcher";
	import { PanelLeftIcon, SunIcon, MoonIcon, Grid2X2Icon, Volume1Icon, Volume2Icon, VolumeOffIcon } from "@lucide/svelte";

	import { browser } from "$app/environment";
	import { page } from "$app/state";

	import { type TitleContext } from "$lib/common";
	import { playerVol, playerMuted, gridCols } from "$lib/stores/live";

	import { Button, Dialog, Slider, Toaster } from "$lib/components/ui";
	import { shell } from "$lib/components/ui/shell.svelte";
	import AppSidebar from "$lib/components/sidebar.svelte";

	let { children } = $props();

	let title = $state("");
	setContext<TitleContext>("title", {
		value: () => title,
		set: (newTitle: string) => {
			title = newTitle;
		},
	});

	const tool = $derived(page.url.pathname.slice(1).split("/")[0] || "live");

	const colsQueue = [6, 5, 4, 3, 2];
	const cycleGridCols = () => {
		gridCols.update((current) => {
			if (current === null) return colsQueue[0];
			const idx = colsQueue.indexOf(current);
			if (idx === -1 || idx === colsQueue.length - 1) return null;
			return colsQueue[idx + 1];
		});
	};

	let prevVolume: number = 0.5;

	if (browser) {
		gridCols.set(parseInt(window.localStorage.getItem("live-grid-cols")!) || null);

		const storedVol = window.localStorage.getItem("player-vol");
		const storedMuted = window.localStorage.getItem("player-muted");
		if (storedVol !== null) playerVol.set(parseFloat(storedVol));
		if (storedMuted !== null) playerMuted.set(storedMuted === "true");

		gridCols.subscribe((v) => {
			if (v) window.localStorage.setItem("live-grid-cols", v.toString());
			else window.localStorage.removeItem("live-grid-cols");
		});
		playerVol.subscribe((v) => window.localStorage.setItem("player-vol", v.toString()));
		playerMuted.subscribe((m) => window.localStorage.setItem("player-muted", m.toString()));
	}

	const toggleMute = () => {
		if ($playerMuted) {
			playerMuted.set(false);
			playerVol.set(prevVolume);
		} else {
			playerMuted.set(true);
			playerVol.set(0);
		}
	};
</script>

<svelte:head>
	{#if title}
		<title>{title} — Twitch Utilities</title>
	{/if}
	<script defer src="https://intel.supa.sh/script.js" data-website-id="a2ca0a43-de0c-42ab-a5e2-43971edbd243" data-exclude-search="true" data-exclude-hash="true"></script>
</svelte:head>

<ModeWatcher />
<Toaster />

<div class="flex min-h-svh w-full">
	<AppSidebar />

	<main class="flex min-w-0 flex-1 flex-col">
		<div class="border-line bg-surface/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b px-2 backdrop-blur">
			<Button variant="ghost" size="icon-sm" onclick={() => shell.toggleSidebar()} title="Toggle sidebar" aria-controls="app-sidebar" aria-expanded={shell.navOpen}>
				<PanelLeftIcon />
				<span class="sr-only">Toggle sidebar</span>
			</Button>

			<Button variant="ghost" size="icon-sm" onclick={toggleMode} title="Toggle theme">
				{#if mode.current === "dark"}
					<MoonIcon />
				{:else}
					<SunIcon />
				{/if}
				<span class="sr-only">Toggle theme</span>
			</Button>

			<div class="bg-line mx-1.5 h-6 w-px"></div>

			{#if tool === "live"}
				<Button variant="ghost" size="icon-sm" onclick={cycleGridCols} title="Change number of grid columns">
					{#if $gridCols === null}
						<Grid2X2Icon />
					{:else}
						<span class="tnum font-display text-sm font-semibold">{$gridCols}</span>
					{/if}
					<span class="sr-only">Change number of grid columns</span>
				</Button>

				<div class="group flex items-center gap-1">
					<Button variant="ghost" size="icon-sm" onclick={toggleMute} title={$playerMuted ? "Unmute streams" : "Mute streams"}>
						{#if $playerMuted}
							<VolumeOffIcon />
						{:else if $playerVol < 0.5}
							<Volume1Icon />
						{:else}
							<Volume2Icon />
						{/if}
						<span class="sr-only">{$playerMuted ? "Unmute streams" : "Mute streams"}</span>
					</Button>
					<Slider
						type="single"
						max={1}
						step={0.01}
						class="w-20 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
						onValueCommit={(v) => {
							if (v !== 0) prevVolume = v;
						}}
						onValueChange={(v) => playerMuted.set(v === 0)}
						bind:value={$playerVol}
					/>
				</div>
			{:else if tool === "logs"}
				<Dialog title="Removals" description="tv.supa.sh cannot process deletion requests.">
					{#snippet trigger({ props })}
						<Button {...props} variant="ghost" size="sm">Removals</Button>
					{/snippet}

					<div class="text-dim space-y-2 text-sm">
						<p>
							This service stores no data of its own. It reads publicly available logs from
							<a href="https://logs.zonian.dev/status" target="_blank" rel="nofollow" class="text-accent ring-focus hover:underline">third-party sources</a>.
						</p>
						<p>Opting out may be possible with each individual instance, depending on that site's own policy.</p>
						<p>We are not affiliated with Twitch or its creators.</p>
					</div>
				</Dialog>
			{/if}
		</div>

		{@render children?.()}
	</main>
</div>
