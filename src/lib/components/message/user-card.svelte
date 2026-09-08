<script lang="ts">
	import dayjs from "dayjs";
	import { mode } from "mode-watcher";

	import { ExternalLinkIcon, ScrollTextIcon, ShieldUserIcon, TagIcon } from "@lucide/svelte";

	import Image from "$lib/components/image.svelte";
	import { Button, Dialog, Skeleton } from "$lib/components/ui";

	import { page } from "$app/state";

	import { dateFormat } from "$lib/common";
	import type { ChatUser } from "$lib/twitch/chat.svelte";
	import { BestLogs, IVR } from "$lib/twitch/services/index.js";
	import type { NameChange, SubAge, User } from "$lib/twitch/services/common";

	let { user = $bindable() }: { user: ChatUser | null } = $props();

	// the dialog fades out over 150ms after `user` is cleared, so the account it was showing has to
	// outlive the close or the card empties out under the animation
	let shown = $state<ChatUser | null>(null);
	$effect(() => {
		if (user) shown = user;
	});

	let profile = $state<User | null>(null);
	let names = $state<NameChange[]>([]);
	let subage = $state<SubAge | null>(null);
	let profileLoading = $state(false);
	let namesLoading = $state(false);
	let subageLoading = $state(false);
	let error = $state("");

	// the lookups hit different hosts and neither half of the card needs the other, so each one
	// fills in on its own rather than behind whichever is slower
	$effect(() => {
		const id = user?.id;
		const inChannel = user?.channel ?? "";
		if (!id) return;

		profile = null;
		names = [];
		subage = null;
		error = "";
		profileLoading = true;
		namesLoading = true;
		subageLoading = Boolean(inChannel);

		let stale = false;

		IVR.getUser(id)
			.then((account) => {
				if (stale) return;
				profile = account;
				if (!account) error = "Twitch has no account under this id anymore.";

				// sub age is keyed by login, so it is the one request that has to wait for this one;
				// left unchained so it does not hold the rest of the profile back
				if (!account || !inChannel) {
					subageLoading = false;
					return;
				}

				IVR.getSubAge(account.login, inChannel)
					.then((result) => {
						if (!stale) subage = result;
					})
					// a viewer with no tie to the channel 404s here, same as a lookup that failed outright
					.catch(() => {})
					.finally(() => {
						if (!stale) subageLoading = false;
					});
			})
			.catch(() => {
				if (stale) return;
				error = "Could not reach the account lookup.";
				subageLoading = false;
			})
			.finally(() => {
				if (!stale) profileLoading = false;
			});

		BestLogs.getNameHistory(id)
			.then((history) => {
				if (!stale) names = [...history].reverse();
			})
			// a dead history lookup leaves the section out rather than saying so twice
			.catch(() => {})
			.finally(() => {
				if (!stale) namesLoading = false;
			});

		return () => {
			stale = true;
		};
	});

	const name = $derived(profile?.displayName || shown?.name || "");
	const login = $derived(profile?.login || name.toLowerCase());
	const channel = $derived(shown?.channel ?? "");
	const nameColor = $derived(`hsl(from ${profile?.chatColor || "gray"} h s ${mode.current === "light" ? "40%" : "70%"})`);

	// the card was opened from the very view the logs button leads to
	const onTheseLogs = $derived(
		page.url.pathname === "/logs" && (page.url.searchParams.get("u") ?? "").toLowerCase() === login && (page.url.searchParams.get("c") ?? "").toLowerCase() === channel.toLowerCase()
	);

	const flags = $derived(
		[
			{ label: "Partner", show: profile?.roles.isPartner, class: "border-accent/40 text-accent" },
			{ label: "Affiliate", show: profile?.roles.isAffiliate, class: "border-signal/40 text-signal" },
			{ label: "Staff", show: profile?.roles.isStaff, class: "border-accent/40 text-accent" },
			// { label: "Bot", show: profile?.verifiedBot, class: "border-line text-dim" },
			{ label: "Banned", show: profile?.banned, class: "border-warn/40 text-warn" },
		].filter((flag) => flag.show)
	);

	const spanAge = (months: number) => {
		const years = Math.floor(months / 12);
		const rest = months % 12;
		if (!years) return `${rest}mo`;
		return rest ? `${years}y ${rest}mo` : `${years}y`;
	};

	// const since = (from: string) => {
	// 	const months = dayjs().diff(from, "month");
	// 	return months ? spanAge(months) : `${dayjs().diff(from, "day")}d`;
	// };

	// const follow = $derived.by(() => {
	// 	if (!subage) return {};
	// 	if (!subage.followedAt) return { value: "never", title: `Not following #${channel}` };
	// 	return { value: since(subage.followedAt), title: `Following #${channel} since ${dayjs(subage.followedAt).format(dateFormat)}` };
	// });

	const sub = $derived.by(() => {
		if (!subage) return {};
		if (subage.statusHidden) return { value: "hidden", title: `${name} keeps their subscription status private` };
		if (!subage.cumulative) return { value: "never", title: `Never subscribed to #${channel}` };

		const streak = subage.streak ? `subscribed since ${dayjs(subage.streak.start).format(dateFormat)}` : "not subscribed right now";
		return { value: spanAge(subage.cumulative.months), title: `${subage.cumulative.months} months in #${channel}, ${streak}` };
	});

	type Stat = { term: string; value?: string | null; width: string; title?: string };

	// `width` is what the value's skeleton stands in at, so the row keeps its height across the load
	const stats = $derived<Stat[]>([
		{ term: "Followers", value: profile && (profile.followers ?? 0).toLocaleString(), width: "w-20" },
		{ term: "Created", value: profile && (profile.createdAt ? dayjs(profile.createdAt).format(dateFormat) : "unknown"), width: "w-24" },
		// { term: "ID", value: profile?.id, width: "w-20" },
		...(subageLoading || subage
			? [
					// { term: "Followed", ...follow, width: "w-14" },
					{ term: "Subscribed", ...sub, width: "w-16" },
				]
			: []),
	]);
</script>

<Dialog bind:open={() => user !== null, (open) => !open && (user = null)} title="User card">
	<div class="flex items-start gap-4">
		{#if profileLoading}
			<Skeleton class="size-14 shrink-0 rounded-sm" />
		{:else if profile?.logo}
			<Image src={profile.logo} alt="" class="size-14 shrink-0 rounded-sm" />
		{:else}
			<div class="bg-raised size-14 shrink-0 rounded-sm"></div>
		{/if}

		<div class="flex min-w-0 flex-1 flex-col gap-1.5 self-center">
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
				<span class="font-display min-w-0 text-xl font-bold" style:color={nameColor}>
					<a
						href="https://www.twitch.tv/{login}"
						target="_blank"
						rel="nofollow"
						data-umami-event="link-Twitch-channel"
						title="twitch.tv/{login}"
						class="ring-focus group inline-flex max-w-full items-center gap-1"
					>
						<span class="truncate">{name}</span>
						<ExternalLinkIcon class="text-dim group-hover:text-accent size-4 shrink-0 transition-colors" />
						<span class="sr-only">Open twitch.tv/{login}</span>
					</a>
				</span>

				{#if login !== name.toLowerCase()}
					<span class="text-dim truncate text-sm">{login}</span>
				{/if}

				{#each flags as flag (flag.label)}
					<span class={["font-display rounded-md border px-1.5 py-0.5 text-sm font-medium", flag.class]}>{flag.label}</span>
				{/each}
			</div>

			{#if profileLoading}
				<Skeleton class="h-5 w-full" />
			{:else if profile?.bio}
				<p class="text-dim line-clamp-2 text-sm" title={profile.bio}>{profile.bio}</p>
			{/if}

			{#if error}
				<p class="text-warn text-sm">{error}</p>
			{/if}
		</div>
	</div>

	{#if profileLoading || profile}
		<dl class="text-dim mx-1 flex flex-wrap justify-between gap-x-6 gap-y-2 text-sm">
			{#each stats as stat (stat.term)}
				<div>
					<dt class="font-display font-medium tracking-wide">{stat.term}</dt>
					<dd class="font-display text-text mt-0.5 text-base font-semibold tabular-nums" title={stat.title}>
						{#if stat.value}{stat.value}{:else}<Skeleton class="h-6 {stat.width}" />{/if}
					</dd>
				</div>
			{/each}
		</dl>
	{/if}

	{#if namesLoading || names.length}
		<section class="flex min-h-0 flex-col gap-1.5">
			<h3 class="font-display flex items-center gap-1.5 text-sm font-semibold">
				<TagIcon class="size-4" />
				Name history
			</h3>
			<!-- an account that has renamed a dozen times would push the links off a phone screen -->
			<div class="border-line overflow-hidden rounded-md border">
				<ul class="max-h-40 overflow-y-auto overscroll-contain text-sm">
					{#if namesLoading}
						<!-- one row: most accounts have only ever chatted under the one name -->
						<li class="flex items-center justify-between gap-3 px-2 py-1">
							<Skeleton class="h-5 w-24" />
							<Skeleton class="h-4 w-32" />
						</li>
					{:else}
						{#each names as entry (entry.user_login + entry.first_timestamp)}
							<li class="border-line flex items-baseline justify-between gap-3 border-b px-2 py-1 last:border-b-0">
								<span class="truncate">{entry.user_login}</span>
								<span class="text-dim shrink-0 text-xs tabular-nums">{dayjs(entry.first_timestamp).format(dateFormat)} – {dayjs(entry.last_timestamp).format(dateFormat)}</span>
							</li>
						{/each}
					{/if}
				</ul>
			</div>
		</section>
	{/if}

	<div class={["mt-1 grid gap-2", onTheseLogs ? "grid-cols-1" : "grid-cols-2"]}>
		{#if !onTheseLogs}
			<!-- /logs reads its filters out of the query once, on mount, so the card has to hand it a fresh
				load rather than a client-side navigation the page would not act on -->
			<Button variant="outline" href="/logs?u={login}{channel ? `&c=${channel}` : ''}" data-sveltekit-reload title={channel ? `Logs of ${login} in #${channel}` : `Logs of ${login}`}>
				<ScrollTextIcon />
				<span class="min-w-0 truncate">{channel ? `#${channel}` : "Logs"}</span>
			</Button>
		{/if}
		<Button variant="outline" href="/roles?u={login}" title="Roles {login} holds">
			<ShieldUserIcon />
			Roles
		</Button>
	</div>
</Dialog>
