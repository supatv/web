<script lang="ts">
	import "@fontsource-variable/inter";
	import "../app.css";

	let { children } = $props();

	import { type TitleContext } from "$lib/common";
	import { playerVol, playerMuted, gridCols } from "$lib/stores/live";

	import { browser } from "$app/environment";
	import { page } from "$app/state";
	import { setContext } from "svelte";

	import { ModeWatcher, toggleMode } from "mode-watcher";

	import { Button } from "$lib/components/ui/button/index.js";
	import { Slider } from "$lib/components/ui/slider/index.js";
	import { SunIcon, MoonIcon, Grid2X2Icon, Volume1Icon, Volume2Icon, VolumeOffIcon } from "@lucide/svelte";

	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import AppSidebar from "$lib/components/sidebar.svelte";

	let sidebarOpened = $state(browser && window.localStorage.getItem("sidebar-provider-state") === "false" ? false : true);
	const sidebarOpenChange = (open: boolean) => {
		window.localStorage.setItem("sidebar-provider-state", open.toString());
	};

	let title = $state("");
	setContext<TitleContext>("title", {
		value: () => title,
		set: (newTitle: string) => {
			title = newTitle;
		},
	});

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
		playerVol.subscribe((v) => {
			window.localStorage.setItem("player-vol", v.toString());
		});
		playerMuted.subscribe((m) => {
			window.localStorage.setItem("player-muted", m.toString());
		});
	}

	const updateVolume = (val: number) => {
		if (val === 0) {
			playerMuted.set(true);
			playerVol.set(0);
		} else {
			playerMuted.set(false);
			playerVol.set(val);
			prevVolume = val;
		}
	};

	const toggleMute = () => {
		if ($playerMuted || $playerVol === 0) {
			playerMuted.set(false);
			playerVol.set(prevVolume > 0 ? prevVolume : 0.5);
		} else {
			playerMuted.set(true);
			playerVol.set(0);
		}
	};
</script>

<svelte:head>
	{#if title}
		<title>{title} — tv.supa.sh</title>
	{/if}
</svelte:head>

<ModeWatcher />
<Sidebar.Provider onOpenChange={sidebarOpenChange} open={sidebarOpened}>
	<AppSidebar />
	<main class="flex flex-1 flex-col">
		<div class="group sticky top-1 z-50 mx-1 flex w-fit gap-1 rounded-md transition-all hover:bg-neutral-300/50 hover:backdrop-blur dark:hover:bg-neutral-600/50">
			<Sidebar.Trigger class="size-7" />
			<Button onclick={toggleMode} variant="ghost" size="icon" class="size-7">
				<SunIcon class="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
				<MoonIcon class="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				<span class="sr-only">Toggle theme</span>
			</Button>
			{#if page.url.pathname === "/live"}
				<Button onclick={cycleGridCols} variant="ghost" size="icon" class="size-7">
					{#if $gridCols === null}
						<Grid2X2Icon />
					{:else}
						<span class="text-base font-[400] tabular-nums">{$gridCols}</span>
					{/if}
					<span class="sr-only">Change number of grid columns</span>
				</Button>
				<div class="flex gap-0.5">
					<Button onclick={toggleMute} variant="ghost" size="icon" class="size-7 min-w-7">
						{#if $playerMuted || $playerVol === 0}
							<VolumeOffIcon />
							<span class="sr-only">Unmute streams</span>
						{:else}
							{#if $playerVol < 0.5}
								<Volume1Icon />
							{:else}
								<Volume2Icon />
							{/if}
							<span class="sr-only">Mute streams</span>
						{/if}
					</Button>
					<Slider
						type="single"
						max={1}
						step={0.01}
						class="mr-1 min-w-20 opacity-0 transition-opacity group-hover:opacity-100 [&:has([data-active])]:opacity-100 [&>*]:!ring-0 [&>*]:!ring-offset-0"
						onValueCommit={updateVolume}
						onValueChange={playerVol.set}
						bind:value={$playerVol}
					/>
				</div>
			{/if}
		</div>

		{@render children?.()}
	</main>
</Sidebar.Provider>

<style>
	:global {
		main:has(#main-fit-screen) {
			max-height: 100vh;
		}
	}
</style>
