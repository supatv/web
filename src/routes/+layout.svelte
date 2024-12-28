<script lang="ts">
	import "@fontsource/inter";
	import "../app.css";

	let { children } = $props();
	import { ModeWatcher, toggleMode } from "mode-watcher";

	import { Button } from "$lib/components/ui/button/index.js";
	import { SunIcon, MoonIcon } from "lucide-svelte";

	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import AppSidebar from "$lib/components/sidebar.svelte";

	let sidebarOpened = $state(window.localStorage.getItem("sidebar-provider-state") === "false" ? false : true);
	const sidebarOpenChange = (open: boolean) => {
		window.localStorage.setItem("sidebar-provider-state", open.toString());
	};
</script>

<ModeWatcher />
<Sidebar.Provider onOpenChange={sidebarOpenChange} open={sidebarOpened}>
	<AppSidebar />
	<main class="flex flex-1 flex-col p-1">
		<div class="flex gap-1 sticky top-1 z-50">
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
