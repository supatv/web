<script lang="ts">
	import { TvIcon, ScrollIcon, HeartIcon, ExternalLinkIcon, FlameIcon } from "@lucide/svelte";
	import dayjs from "dayjs";

	import { afterNavigate } from "$app/navigation";
	import { page } from "$app/state";

	import potatLogo from "$lib/assets/logos/potat.png";
	import bestlogsLogo from "$lib/assets/logos/bestlogs.png";

	import Logo from "./logo.svelte";
	import { shell } from "./ui/shell.svelte";

	const sections = [
		{
			label: "Romanian",
			items: [{ href: "/live", icon: TvIcon, name: "Livestreams" }],
		},
		{
			label: "Chat",
			items: [
				{ href: "/logs", icon: ScrollIcon, name: "Logs" },
				{ href: "/firehose", icon: FlameIcon, name: "Firehose" },
			],
		},
	];

	const related = [
		{ href: "https://logs.zonian.dev/status", logo: bestlogsLogo, name: "Best Logs", event: "link-BestLogs" },
		{ href: "https://potat.app", logo: potatLogo, name: "PotatBotat", event: "link-PotatBotat" },
	];

	// gating the drawer on the media query as well as the flag means growing past `md` puts the
	// sidebar back in the flow without leaving a stale open drawer behind
	const drawerOpen = $derived(shell.isMobile && shell.mobileNavOpen);

	afterNavigate(() => (shell.mobileNavOpen = false));

	$effect(() => {
		if (!drawerOpen) return;

		const { overflow } = document.body.style;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = overflow;
		};
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === "Escape" && drawerOpen) shell.mobileNavOpen = false;
	}}
/>

{#if drawerOpen}
	<button type="button" aria-label="Close navigation" class="fixed inset-0 z-40 bg-black/60 md:hidden" onclick={() => (shell.mobileNavOpen = false)}></button>
{/if}

<nav
	id="app-sidebar"
	aria-label="Main"
	inert={!shell.navOpen}
	class={[
		"bg-surface flex h-svh shrink-0 flex-col overflow-hidden",
		// mobile: an overlay drawer that never takes up flow width, so a collapsed sidebar cannot
		// push the page off screen
		"max-md:fixed max-md:top-0 max-md:left-0 max-md:z-50 max-md:w-60 max-md:shadow-2xl max-md:transition-transform max-md:duration-200",
		drawerOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
		// desktop: in the flow, collapsing by width
		"md:sticky md:top-0 md:transition-[width] md:duration-200",
		shell.sidebarOpen ? "md:w-60" : "md:w-0",
	]}
>
	<div class="flex w-60 min-w-60 flex-1 flex-col">
		<a href="/live" class="ring-focus border-line flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
			<Logo class="text-accent size-6 shrink-0" />
			<span class="flex flex-col leading-none">
				<span class="font-display text-text text-base font-bold tracking-tight">Twitch Utilities</span>
				<span class="text-dim text-xs">tv.supa.sh</span>
			</span>
		</a>

		<div class="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
			{#each sections as section (section.label)}
				<div class="flex flex-col gap-0.5">
					<h2 class="font-display text-dim mb-1 px-2 text-xs font-semibold tracking-wide">{section.label}</h2>
					{#each section.items as item (item.href)}
						{@const active = page.url.pathname === item.href}
						<a
							href={item.href}
							aria-current={active ? "page" : undefined}
							class={[
								"ring-focus relative flex h-10 items-center gap-2.5 rounded-md pr-2 pl-3 text-[0.9375rem] transition-colors",
								active ? "bg-raised text-text font-medium" : "text-dim hover:bg-raised/60 hover:text-text",
							]}
						>
							<item.icon class={["size-4 shrink-0", active && "text-accent fill-accent/25"]} />
							<span>{item.name}</span>
						</a>
					{/each}
				</div>
			{/each}

			<div class="mt-auto flex flex-col gap-0.5 opacity-55 transition-opacity hover:opacity-100">
				<h2 class="font-display text-dim mb-1 px-2 text-xs font-semibold tracking-wide">Related projects</h2>
				{#each related as item (item.href)}
					<a
						href={item.href}
						target="_blank"
						rel="nofollow"
						data-umami-event={item.event}
						class="ring-focus text-dim hover:bg-raised/60 hover:text-text flex h-10 items-center gap-2.5 rounded-md px-3 text-[0.9375rem] transition-colors"
					>
						<img alt="" src={item.logo} class="size-4 shrink-0" />
						<span>{item.name}</span>
						<ExternalLinkIcon class="ml-auto size-3" />
					</a>
				{/each}
			</div>
		</div>

		<div class="border-line text-dim border-t p-2 text-xs leading-relaxed">
			<a href="https://github.com/supatv/web/commit/{__COMMIT_HASH}" target="_blank" rel="nofollow" data-umami-event="link-GitHub-commit" class="ring-focus hover:text-text">
				{dayjs(__BUILD_DATE).format("D MMM")}, commit <span class="tnum font-mono">{__COMMIT_HASH.slice(0, 7)}</span>
			</a>
			<p class="mt-1">
				not affiliated with Twitch or its creators<br />
				&copy; {new Date().getFullYear()} supa.sh
				<HeartIcon class="text-accent inline size-4" fill="currentColor" />
			</p>
		</div>
	</div>
</nav>
