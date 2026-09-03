<script lang="ts">
	import { TvIcon, ScrollIcon, HeartIcon, SparklesIcon, ExternalLinkIcon, FlameIcon } from "@lucide/svelte";
	import dayjs from "dayjs";

	import { page } from "$app/state";

	import potatLogo from "$lib/assets/logos/potat.png";
	import bestlogsLogo from "$lib/assets/logos/bestlogs.png";

	import { shell } from "./ui/shell.svelte";

	const sections = [
		{
			label: "Romanian",
			items: [{ href: "/live", tool: "live", icon: TvIcon, name: "Livestreams" }],
		},
		{
			label: "Chat",
			items: [
				{ href: "/logs", tool: "logs", icon: ScrollIcon, name: "Logs" },
				{ href: "/firehose", tool: "firehose", icon: FlameIcon, name: "Firehose" },
			],
		},
	];

	const related = [
		{ href: "https://logs.zonian.dev/status", logo: bestlogsLogo, name: "Best Logs", event: "link-BestLogs" },
		{ href: "https://potat.app", logo: potatLogo, name: "PotatBotat", event: "link-PotatBotat" },
	];
</script>

<nav
	class={[
		"border-line bg-surface z-40 flex shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200",
		shell.sidebarOpen ? "w-60" : "w-0 border-r-0",
		shell.mobileNavOpen && "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-60 max-md:shadow-2xl",
	]}
	aria-label="Main"
>
	<div class="flex w-60 min-w-60 flex-1 flex-col">
		<a href="/live" class="ring-focus border-line flex items-center gap-2.5 border-b px-4 py-3.5">
			<SparklesIcon class="text-accent size-5 shrink-0" fill="currentColor" />
			<span class="flex flex-col leading-none">
				<span class="font-display text-text text-sm font-bold tracking-tight">Twitch Utilities</span>
				<span class="text-dim mt-0.5 text-[0.7rem]">tv.supa.sh</span>
			</span>
		</a>

		<div class="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
			{#each sections as section (section.label)}
				<div class="flex flex-col gap-0.5">
					<h2 class="font-display text-dim mb-1 px-2 text-[0.7rem] font-semibold tracking-wide">{section.label}</h2>
					{#each section.items as item (item.href)}
						{@const active = page.url.pathname === item.href}
						<a
							href={item.href}
							data-tool={item.tool}
							aria-current={active ? "page" : undefined}
							class={[
								"ring-focus relative flex h-8 items-center gap-2.5 rounded-md pr-2 pl-3 text-sm transition-colors",
								"before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-0.5 before:rounded-full before:transition-colors",
								active ? "bg-raised text-text before:bg-accent font-medium" : "text-dim hover:bg-raised/60 hover:text-text",
							]}
						>
							<item.icon class={["size-4 shrink-0", active && "text-accent"]} />
							<span>{item.name}</span>
						</a>
					{/each}
				</div>
			{/each}

			<div class="mt-auto flex flex-col gap-0.5 opacity-55 transition-opacity hover:opacity-100">
				<h2 class="font-display text-dim mb-1 px-2 text-[0.7rem] font-semibold tracking-wide">Related projects</h2>
				{#each related as item (item.href)}
					<a
						href={item.href}
						target="_blank"
						rel="nofollow"
						data-umami-event={item.event}
						class="ring-focus text-dim hover:bg-raised/60 hover:text-text flex h-8 items-center gap-2.5 rounded-md px-3 text-sm transition-colors"
					>
						<img alt="" src={item.logo} class="size-4 shrink-0" />
						<span>{item.name}</span>
						<ExternalLinkIcon class="ml-auto size-3" />
					</a>
				{/each}
			</div>
		</div>

		<div class="border-line text-dim border-t px-4 py-3 text-[0.7rem] leading-relaxed">
			<a href="https://github.com/supatv/web/commit/{__COMMIT_HASH}" target="_blank" rel="nofollow" data-umami-event="link-GitHub-commit" class="ring-focus hover:text-text">
				{dayjs(__BUILD_DATE).format("D MMM")}, commit <span class="tnum font-mono">{__COMMIT_HASH.slice(0, 7)}</span>
			</a>
			<p class="mt-1">
				not affiliated with Twitch or its creators<br />
				&copy; {new Date().getFullYear()} supa.sh
				<HeartIcon class="text-accent inline size-3" fill="currentColor" />
			</p>
		</div>
	</div>
</nav>

{#if shell.mobileNavOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-30 bg-black/60 md:hidden" onclick={() => (shell.mobileNavOpen = false)}></div>
{/if}
