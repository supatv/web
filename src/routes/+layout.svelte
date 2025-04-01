<script lang="ts">
	import "@fontsource/inter";
	import "../app.css";

	let { children } = $props();

	import { randomEmoji, type TitleContext } from "$lib/common";

	import { browser } from "$app/environment";
	import { setContext } from "svelte";

	import { ModeWatcher, toggleMode } from "mode-watcher";

	import { Button } from "$lib/components/ui/button/index.js";
	import { SunIcon, MoonIcon } from "lucide-svelte";

	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import AppSidebar from "$lib/components/sidebar.svelte";

	let sidebarOpened = $state(browser && window.localStorage.getItem("sidebar-provider-state") === "false" ? false : true);
	const sidebarOpenChange = (open: boolean) => {
		window.localStorage.setItem("sidebar-provider-state", open.toString());
	};

	let emoji = $state(randomEmoji());

	let title = $state("");
	setContext<TitleContext>("title", {
		value: () => title,
		set: (newTitle: string) => {
			title = newTitle;
			emoji = randomEmoji();
		},
	});

	let joker = $state(browser && window.localStorage.getItem("aprilfools-2025") === "false" ? false : true);
	$effect(() => {
		if (joker) return document.documentElement.classList.add("font-joker");
		document.documentElement.classList.remove("font-joker");
	});

	const toggleJoker = () => {
		joker = !joker;
		window.localStorage.setItem("aprilfools-2025", joker.toString());
	};
</script>

<svelte:head>
	{#if title}
		<title>{title} {emoji} tv.supa.sh</title>
	{/if}
</svelte:head>

<ModeWatcher />
<Sidebar.Provider onOpenChange={sidebarOpenChange} open={sidebarOpened}>
	<AppSidebar />
	<main class="flex flex-1 flex-col">
		<div class="flex gap-1 sticky top-1 z-50 px-1 w-fit">
			<Sidebar.Trigger class="size-7" />
			<Button onclick={toggleMode} variant="ghost" size="icon" class="size-7">
				<SunIcon class="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
				<MoonIcon class="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				<span class="sr-only">Toggle theme</span>
			</Button>
			<Button onclick={toggleJoker} variant="ghost" size="icon" class="size-7">
				<img src="/trollface.webp" class="size-5 {!joker ? 'opacity-50' : ''}" alt="tf" />
			</Button>
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
