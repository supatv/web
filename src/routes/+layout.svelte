<script lang="ts">
	import "@fontsource-variable/inter";
	import "../app.css";

	let { children } = $props();

	import { randomEmoji, type TitleContext } from "$lib/common";

	import { browser } from "$app/environment";
	import { setContext } from "svelte";

	import { ModeWatcher, toggleMode } from "mode-watcher";

	import { Button } from "$lib/components/ui/button/index.js";
	import { SunIcon, MoonIcon } from "@lucide/svelte";

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
		<div class="sticky top-1 z-50 flex w-fit gap-1 px-1">
			<Sidebar.Trigger class="size-7" />
			<Button onclick={toggleMode} variant="ghost" size="icon" class="size-7">
				<SunIcon class="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
				<MoonIcon class="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				<span class="sr-only">Toggle theme</span>
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
