<script lang="ts">
	import { TvIcon, ScrollIcon, GitCommitHorizontalIcon, ExternalLinkIcon, FlameIcon, ShieldIcon } from "@lucide/svelte";
	import dayjs from "dayjs";

	import { afterNavigate } from "$app/navigation";
	import { page } from "$app/state";

	import potatLogo from "$lib/assets/logos/potat.png";
	import bestlogsLogo from "$lib/assets/logos/bestlogs.png";

	import Logo from "./logo.svelte";
	import { shell } from "./ui/shell.svelte";

	let logo: ReturnType<typeof Logo> | undefined = $state();

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
		{
			label: "Accounts",
			items: [{ href: "/roles", icon: ShieldIcon, name: "Roles" }],
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

{#snippet sparkle(className: string)}
	<svg viewBox="0 0 24 24" class={["text-accent pointer-events-none transition-transform duration-300 group-hover:scale-125 group-hover:rotate-90", className]} aria-hidden="true">
		<path d="M12 0c0 6.6 5.4 12 12 12-6.6 0-12 5.4-12 12 0-6.6-5.4-12-12-12 6.6 0 12-5.4 12-12z" fill="currentColor" />
	</svg>
{/snippet}

{#snippet heart(className: string)}
	<svg viewBox="0 0 24 24" class={["text-accent shrink-0", className]} aria-hidden="true">
		<path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.2C19.5 16.4 12 21 12 21z" fill="currentColor" />
	</svg>
{/snippet}

<svelte:window
	onkeydown={(e) => {
		if (e.key === "Escape" && drawerOpen) shell.mobileNavOpen = false;
	}}
/>

{#if drawerOpen}
	<button type="button" aria-label="Close navigation" class="fixed inset-0 z-40 bg-black/60 md:hidden" onclick={() => (shell.mobileNavOpen = false)}></button>
{/if}

<!-- the nav is fixed, so on desktop this reserves its width in the flow -->
<div class={["hidden shrink-0 md:block md:transition-[width] md:duration-200", shell.sidebarOpen ? "md:w-60" : "md:w-0"]}></div>

<nav
	id="app-sidebar"
	aria-label="Main"
	inert={!shell.navOpen}
	class={[
		// fixed rather than sticky: a sticky element is re-rasterised at whatever subpixel offset
		// the page scroll lands on, so with fractional display scaling it shifts by a pixel when a
		// scroll ends somewhere that is not a whole device pixel
		"bg-surface fixed top-0 left-0 flex h-svh flex-col overflow-hidden",
		// mobile: an overlay drawer that never takes up flow width, so a collapsed sidebar cannot
		// push the page off screen
		"max-md:z-50 max-md:w-60 max-md:shadow-2xl max-md:transition-transform max-md:duration-200",
		drawerOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
		// desktop: collapsing by width, below the z-40 popover backdrops
		"md:z-30 md:transition-[width] md:duration-200",
		shell.sidebarOpen ? "md:w-60" : "md:w-0",
	]}
>
	<div class="flex min-h-0 w-60 min-w-60 flex-1 flex-col">
		<a
			href="/live"
			onclick={() => logo?.play()}
			class="ring-focus border-line group after:from-accent/60 relative flex h-14 shrink-0 items-center gap-2 border-b px-3 after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-linear-to-r after:to-transparent after:to-80%"
		>
			<span
				class="from-accent/25 group-hover:from-accent/40 relative grid size-11 shrink-0 place-items-center rounded-full bg-radial to-transparent to-70% transition-transform duration-200 group-hover:scale-105"
			>
				<Logo bind:this={logo} class="text-accent size-8" />
				{@render sparkle("absolute -top-0.5 -right-0.5 size-3")}
				{@render sparkle("absolute bottom-0.5 -left-1 size-2 opacity-70")}
			</span>
			<span class="flex flex-col leading-none">
				<span class="font-display text-text text-base font-bold tracking-tight">Twitch Utilities</span>
				<span class="text-dim text-xs">tv.supa.sh</span>
			</span>
		</a>

		<div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3">
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
							<item.icon class="size-4 shrink-0" />
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

		<div class="border-line text-dim shrink-0 border-t px-2 py-3 text-xs">
			<div class="flex items-center justify-between gap-2">
				<span class="font-display text-text inline-flex items-center gap-1 text-sm font-bold tracking-tight">
					supa.sh
					{@render heart("size-3")}
				</span>
				<a
					href="https://github.com/supatv/web/commit/{__COMMIT_HASH}"
					target="_blank"
					rel="nofollow"
					data-umami-event="link-GitHub-commit"
					class="ring-focus bg-raised hover:text-text inline-flex h-6 items-center gap-1 rounded-full px-2 tabular-nums transition-colors"
				>
					<GitCommitHorizontalIcon class="size-3.5 shrink-0" />
					<span class="sr-only">commit</span>
					{__COMMIT_HASH.slice(0, 7)}
				</a>
			</div>
			<p class="mt-2 leading-relaxed">
				&copy; {new Date().getFullYear()} &middot; built {dayjs(__BUILD_DATE).format("D MMM")}<br />
				not affiliated with Twitch or its creators
			</p>
		</div>
	</div>
</nav>
