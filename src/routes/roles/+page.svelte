<script lang="ts">
	import dayjs from "dayjs";

	import { getContext, onMount, untrack } from "svelte";

	import { mode } from "mode-watcher";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";

	import { LoaderCircleIcon, ExternalLinkIcon, UsersIcon, PaletteIcon, CrownIcon, SwordIcon, GemIcon, StarIcon, BadgeCheckIcon, DiamondIcon, TrophyIcon } from "@lucide/svelte";

	import { Button, Checkbox, Input, Label, Panel, Select, Skeleton, type SelectOption } from "$lib/components/ui";
	import VirtualList from "$lib/components/virtual-list.svelte";
	import Image from "$lib/components/image.svelte";

	import { compactNumber, dateFormat, dateTimeFormat, type TitleContext } from "$lib/common";
	import rolesApi, {
		parseTarget,
		roleNames,
		type GlobalStats,
		type RoleName,
		type RoleRanking,
		type RoleSummary,
		type RoleTarget,
		type RoleUser,
		type RolesView,
		type SearchUser,
	} from "$lib/twitch/roles";

	getContext<TitleContext>("title").set("Roles");

	// the virtualised rows are absolutely positioned, so this has to match their rendered height
	const rowHeight = 48;

	type RoleSection = {
		role: RoleName;
		rows: RoleUser[];
		total: number;
		cursor: string | null;
		loading: boolean;
		error: string | null;
		summary: RoleSummary | null;
		rank: RoleRanking | null;
	};

	// icons follow the badges Twitch itself uses for each role
	const roleLabels = {
		artists: { title: "Artists", singular: "Artist", icon: PaletteIcon },
		founders: { title: "Founders", singular: "Founder", icon: CrownIcon },
		moderators: { title: "Moderators", singular: "Moderator", icon: SwordIcon },
		vips: { title: "VIPs", singular: "VIP", icon: GemIcon },
		subscribers: { title: "Subscribers", singular: "Subscriber", icon: StarIcon },
	} satisfies Record<RoleName, { title: string; singular: string; icon: unknown }>;

	// one account holds one role across many channels, so the user side reads as a single role
	const roleTitle = (role: RoleName) => (view === "user" ? roleLabels[role].singular : roleLabels[role].title);

	const viewOptions: SelectOption[] = [
		{ value: "user", label: "Roles they hold" },
		{ value: "channel", label: "Roles in their channel" },
	];

	const reason = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

	let stats = $state<GlobalStats | null>(null);

	let inputName = $state("");
	let name = $state("");

	let nameInput: HTMLInputElement | null = $state(null);
	let nameFocused = $state(false);
	let nameTyped = $state(false);
	let foundUsers = $state<SearchUser[]>([]);
	let selectedIndex = $state(-1);
	let view: RolesView = $state("user");
	let includeInactive = $state(false);

	let user = $state<RoleUser | null>(null);
	let userError = $state<string | null>(null);
	let userLoading = $state(false);

	let sections = $state<RoleSection[]>([]);
	let activeRole = $state<RoleName>("moderators");

	// the params behind the rendered sections, kept out of the reactive graph so a scroll-triggered
	// page can join the abort of the lookup it is extending without becoming an effect dependency
	let sectionQuery: { lookup: RoleTarget; view: RolesView; inactive: boolean; controller: AbortController } | null = null;

	const target = $derived(name ? parseTarget(name) : null);
	const indexedRoles = $derived.by(() => {
		const counts = stats;
		return counts ? roleNames.reduce((sum, key) => sum + counts[key].count, 0) : 0;
	});

	const visibleSections = $derived(sections.filter((section) => section.loading || section.total || section.error));
	// below the grid breakpoint only one column is on screen, so fall back if the tab has nothing behind it
	const activeSection = $derived(visibleSections.find((section) => section.role === activeRole) ?? visibleSections[0]);

	onMount(() => {
		// autofocus fires before hydration attaches onfocus, so the initial focus is never seen
		nameFocused = document.activeElement === nameInput;

		rolesApi
			.getStats()
			.then((data) => (stats = data))
			.catch(() => {});

		const q = page.url.searchParams;

		inputName = name = q.get("u") || "";
		view = q.get("v") === "channel" ? "channel" : "user";
		includeInactive = q.get("i") === "1";
	});

	// the api matches a login prefix, so an id: target has nothing to complete against
	$effect(() => {
		const query = inputName.trim().toLowerCase();
		// the results on screen answer an older query until this one lands, so nothing is preselected in between
		selectedIndex = -1;
		if (!query || !nameTyped || query.startsWith("id:")) {
			foundUsers = [];
			return;
		}

		const controller = new AbortController();
		const timeout = setTimeout(async () => {
			try {
				foundUsers = await rolesApi.searchUsers(query, 5, controller.signal);
				// Enter picks a result only when it continues what was typed
				selectedIndex = foundUsers[0]?.login.startsWith(query) ? 0 : -1;
			} catch {
				if (!controller.signal.aborted) foundUsers = [];
			}
		}, 120);

		return () => {
			clearTimeout(timeout);
			controller.abort();
		};
	});

	const showAutocomplete = $derived(nameFocused && nameTyped && foundUsers.length > 0);

	const selectResult = (index: number, lookup = false) => {
		const found = foundUsers[index];
		if (!found) return;

		inputName = found.login;
		selectedIndex = -1;
		nameTyped = false;
		if (lookup) name = found.login;
	};

	const nameKeydown = (event: KeyboardEvent) => {
		if (!showAutocomplete) return;

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				selectedIndex = (selectedIndex + 1) % foundUsers.length;
				break;
			case "ArrowUp":
				event.preventDefault();
				selectedIndex = selectedIndex <= 0 ? foundUsers.length - 1 : selectedIndex - 1;
				break;
			case "Escape":
				nameTyped = false;
				break;
			// enter falls through to the form submit, which picks the filled-in login up
			case "Tab":
			case "Enter":
				selectResult(selectedIndex);
				break;
		}
	};

	$effect(() => {
		const search = {
			u: name,
			v: view === "channel" ? "channel" : null,
			i: includeInactive ? "1" : null,
		};

		untrack(() => {
			const query = page.url.searchParams;

			for (const [key, value] of Object.entries(search)) {
				if (!value) {
					query.delete(key);
				} else if (value !== query.get(key)) {
					query.set(key, value);
				}
			}

			goto(page.url.search, { replaceState: true, keepFocus: true });
		});
	});

	$effect(() => {
		const lookup = target;
		const perspective = view;
		if (!lookup) {
			user = null;
			userError = null;
			return;
		}

		const controller = new AbortController();
		userLoading = true;

		rolesApi
			.getUser(perspective, lookup, controller.signal)
			.then((data) => {
				user = data;
				userError = null;
			})
			.catch((err) => {
				if (controller.signal.aborted) return;
				user = null;
				userError = reason(err);
			})
			.finally(() => {
				if (!controller.signal.aborted) userLoading = false;
			});

		return () => controller.abort();
	});

	// the tab only matters on a narrow screen, so open on whichever role the account has most of
	$effect(() => {
		const counts = user?.roles;
		if (!counts) return;

		const largest = roleNames.reduce((best, candidate) => (counts[candidate] > counts[best] ? candidate : best));
		if (counts[largest]) untrack(() => (activeRole = largest));
	});

	const loadPage = async (index: number, after: string | null = null) => {
		const query = sectionQuery;
		const section = sections[index];
		if (!query || !section || section.loading) return;

		section.loading = true;
		section.error = null;

		try {
			const result = await rolesApi.getRoleList(query.view, section.role, query.lookup, { after, includeInactive: query.inactive }, query.controller.signal);
			if (query.controller.signal.aborted) return;

			section.rows = after ? section.rows.concat(result.data) : result.data;
			section.total = result.total;
			section.cursor = result.cursor;

			// summary and rank describe only the roles an account holds, so they have no channel-side meaning
			if (!after && result.total && query.view === "user") loadSummary(index);
		} catch (err) {
			if (!query.controller.signal.aborted) section.error = reason(err);
		} finally {
			if (!query.controller.signal.aborted) section.loading = false;
		}
	};

	const loadSummary = async (index: number) => {
		const query = sectionQuery;
		const section = sections[index];
		if (!query || !section) return;

		const [summaryResult, rankResult] = await Promise.allSettled([
			rolesApi.getSummary(section.role, query.lookup, query.controller.signal),
			rolesApi.getRank(section.role, query.lookup, query.controller.signal),
		]);
		if (query.controller.signal.aborted) return;

		section.summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
		section.rank = rankResult.status === "fulfilled" ? rankResult.value : null;
	};

	$effect(() => {
		const lookup = target;
		const perspective = view;
		const inactive = includeInactive;
		const account = user;
		const counts = account?.roles;

		untrack(() => {
			sections = roleNames.map((role) => ({
				role,
				rows: [],
				total: counts?.[role] ?? 0,
				cursor: null,
				loading: false,
				error: null,
				summary: null,
				rank: null,
			}));
		});

		if (!lookup || !account) {
			sectionQuery = null;
			return;
		}

		const controller = new AbortController();
		sectionQuery = { lookup, view: perspective, inactive, controller };

		untrack(() =>
			roleNames.forEach((role, index) => {
				// a role the account holds none of has nothing to page through, unless revoked grants are being shown too
				if (inactive || counts?.[role]) loadPage(index);
			})
		);

		return () => controller.abort();
	});

	const openUser = (login: string) => {
		nameTyped = false;
		inputName = name = login;
	};

	// keeps the row a real link — modified clicks still open a tab, a plain one swaps the page in place
	const rowClick = (event: MouseEvent, login: string) => {
		if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		openUser(login);
	};

	const formSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		nameTyped = false;
		name = inputName.trim();
	};

	const skeletonRows = (section: RoleSection) => {
		const remaining = section.total - section.rows.length;
		return Math.min(8, remaining > 0 ? remaining : 8);
	};

	// a narrow column drops most of the columns, so the row carries the same detail as a tooltip
	const rowTitle = (row: RoleUser) => {
		const parts = [row.login];
		if (row.isPartner) parts.push("partner");
		else if (row.isAffiliate) parts.push("affiliate");

		parts.push(`${(row.followers ?? 0).toLocaleString()} followers`);
		if (row.grantedAt) parts.push(`granted ${dayjs(row.grantedAt).format(dateTimeFormat)}`);
		if (row.active === false) parts.push("revoked");
		return parts.join(" · ");
	};

	// what the row puts on screen, for a row that is not on screen to be found by
	const rowText = (section: RoleSection, index: number) => {
		const row = section.rows[index];
		return row ? row.displayName || row.login : "";
	};

	const summaryLine = (section: RoleSection) => {
		if (!section.summary) return "";

		const parts = [`${compactNumber(section.summary.partners)} partners`, `${compactNumber(section.summary.affiliates)} affiliates`];
		if (section.summary.staff) parts.push(`${compactNumber(section.summary.staff)} staff`);
		parts.push(`${compactNumber(section.summary.channelsTotalFollowers)} combined followers`);

		return parts.join(" · ");
	};

	const flags = $derived(
		user
			? [
					{ label: "Partner", show: user.isPartner, class: "border-accent/40 text-accent" },
					{ label: "Affiliate", show: user.isAffiliate, class: "border-signal/40 text-signal" },
					{ label: "Staff", show: user.isStaff, class: "border-accent/40 text-accent" },
					{ label: "Bot", show: user.isBot, class: "border-line text-dim" },
					{ label: "Collaborator", show: user.isCollaborator, class: "border-line text-dim" },
					{ label: "Banned", show: user.isBanned, class: "border-warn/40 text-warn" },
				].filter((flag) => flag.show)
			: []
	);
</script>

<svelte:head>
	<link rel="preconnect" href="https://roles.tv" />
	<meta property="og:title" content="Twitch Roles" />
	<meta name="keywords" content="twitch, twitch roles, moderator list, vip list, founders, subscribers, twitch tools, who moderates" />
	<meta name="description" content="Look up the moderator, VIP, founder, artist and subscriber roles of any Twitch account." />
	<meta property="og:description" content="Look up the moderator, VIP, founder, artist and subscriber roles of any Twitch account." />
</svelte:head>

<div id="main-fit-screen" class="hidden"></div>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 xl:overflow-y-visible">
	<header class="flex flex-wrap items-baseline gap-x-3">
		<h1 class="font-display text-3xl font-bold tracking-tight">Twitch Roles</h1>
		{#if stats}
			<p class="text-dim text-base">
				<span class="font-display text-text font-semibold tabular-nums">{compactNumber(stats.users.count)}</span> accounts and
				<span class="font-display text-text font-semibold tabular-nums">{compactNumber(indexedRoles)}</span> roles indexed
			</p>
		{/if}
	</header>

	<form class="flex flex-wrap items-end gap-2" onsubmit={formSubmit}>
		<div class="relative flex flex-col gap-1">
			<Label for="input-user">User <span class="text-accent">required</span></Label>
			<Input
				id="input-user"
				class={showAutocomplete ? "w-44 rounded-b-none" : "w-44"}
				maxlength={25}
				bind:ref={nameInput}
				bind:value={inputName}
				placeholder="Username or id:123"
				onkeydown={nameKeydown}
				oninput={() => (nameTyped = true)}
				onfocus={() => (nameFocused = true)}
				onblur={() => (nameFocused = false)}
				autocomplete="off"
				spellcheck="false"
				autofocus
			/>

			{#if showAutocomplete}
				<!-- one shell with the field: flush under it, squared at the join and carrying the same accent border, so the pair reads as one outline -->
				<Panel class="absolute top-full right-0 left-0 z-20 overflow-hidden rounded-t-none rounded-b-md border border-t-0 p-1 shadow-lg">
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					{#each foundUsers as found, index (found.id)}
						<div
							class={["flex h-9 cursor-pointer items-center gap-2 rounded-[5px] px-2 text-base transition-colors", index === selectedIndex ? "bg-raised text-text" : "text-dim"]}
							onmouseenter={() => (selectedIndex = index)}
							onmousedown={() => selectResult(index, true)}
						>
							{#if found.avatar}
								<Image src={found.avatar} alt="" class="size-6 shrink-0 rounded-sm" />
							{:else}
								<div class="bg-raised size-6 shrink-0 rounded-sm"></div>
							{/if}
							<span class="truncate">{found.displayName || found.login}</span>
							{#if found.displayName && found.displayName.toLowerCase() !== found.login}
								<span class="text-dim/70 truncate text-sm">{found.login}</span>
							{/if}
						</div>
					{/each}
				</Panel>
			{/if}
		</div>

		<div class="flex flex-col gap-1">
			<Label for="input-view">Perspective</Label>
			<Select id="input-view" class="w-56" value={view} options={viewOptions} onValueChange={(value) => (view = value as RolesView)} />
		</div>

		<Button type="submit" variant="accent" disabled={userLoading}>
			{#if userLoading}
				<LoaderCircleIcon class="animate-spin" />
			{/if}
			Look up
		</Button>

		{#if user}
			<div class="flex items-center gap-2 md:ml-auto">
				<Checkbox id="include-inactive" bind:checked={includeInactive} />
				<Label for="include-inactive" class="cursor-pointer">Include revoked</Label>
			</div>
		{/if}
	</form>

	{#if userError}
		<p class="text-warn text-sm">{userError}</p>
	{:else if user}
		<Panel class="flex shrink-0 flex-wrap items-center gap-4 p-4">
			{#if user.avatar}
				<Image src={user.avatar} alt="" class="size-14 shrink-0 rounded-sm" />
			{:else}
				<div class="bg-raised size-14 shrink-0 rounded-sm"></div>
			{/if}

			<div class="flex min-w-0 flex-1 basis-56 flex-col gap-1">
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
					<h2 class="font-display truncate text-xl font-bold" style:color={`hsl(from ${user.chatColor || "gray"} h s ${mode.current === "light" ? "40%" : "70%"})`}>
						{user.displayName || user.login}
					</h2>
					<a
						href="https://www.twitch.tv/{user.login}"
						target="_blank"
						rel="nofollow"
						data-umami-event="link-Twitch-channel"
						class="ring-focus text-dim hover:text-accent inline-flex items-center gap-1 text-base"
					>
						twitch.tv/{user.login}
						<ExternalLinkIcon class="size-3.5" />
					</a>

					{#each flags as flag (flag.label)}
						<span class={["font-display rounded-md border px-1.5 py-0.5 text-sm font-medium", flag.class]}>{flag.label}</span>
					{/each}
				</div>

				{#if user.description}
					<p class="text-dim line-clamp-2 text-sm" title={user.description}>{user.description}</p>
				{/if}
			</div>

			<dl class="text-dim flex gap-6 text-sm">
				<div>
					<dt class="font-display font-medium tracking-wide">Followers</dt>
					<dd class="font-display text-text mt-0.5 text-base font-semibold tabular-nums">{(user.followers ?? 0).toLocaleString()}</dd>
				</div>
				{#if user.createdAt}
					<div>
						<dt class="font-display font-medium tracking-wide">Created</dt>
						<dd class="font-display text-text mt-0.5 text-base font-semibold tabular-nums">{dayjs(user.createdAt).format(dateFormat)}</dd>
					</div>
				{/if}
			</dl>
		</Panel>

		<!-- the five lists only fit side by side on a wide screen; below that they collapse to one tabbed column -->
		<div class="flex shrink-0 flex-wrap gap-1.5 xl:hidden">
			{#each visibleSections as section (section.role)}
				{@const TabIcon = roleLabels[section.role].icon}
				<Button variant={activeSection?.role === section.role ? "solid" : "outline"} size="sm" aria-pressed={activeSection?.role === section.role} onclick={() => (activeRole = section.role)}>
					<TabIcon />
					{roleTitle(section.role)}
					<span class="tabular-nums opacity-75">{compactNumber(section.total)}</span>
				</Button>
			{/each}
		</div>

		<!-- flex rather than five fixed tracks: an account holding only two of the roles would leave the other columns as dead space -->
		<div class="flex min-h-0 flex-1 flex-col gap-3 max-xl:min-h-[55svh] xl:flex-row">
			{#each sections as section, sectionIndex (section.role)}
				{#if section.loading || section.total || section.error}
					{@const RoleIcon = roleLabels[section.role].icon}
					<section class={["@container flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 xl:max-w-xl", activeSection?.role !== section.role && "max-xl:hidden"]}>
						<div class="flex shrink-0 flex-col">
							<div class="flex items-center gap-2">
								<div class="flex min-w-0 items-baseline gap-1">
									<RoleIcon class="size-4 shrink-0 self-center text-base" />
									<h2 class="font-display truncate text-base font-bold tracking-tight">{roleTitle(section.role)}</h2>
									<span class="font-display text-dim text-sm font-semibold whitespace-nowrap tabular-nums">{view === "user" ? "in " : ""}{section.total.toLocaleString()}</span>
								</div>

								{#if section.rank?.total_channels}
									<span
										class="font-display text-dim flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums"
										title="Ranked #{section.rank.total_channels.toLocaleString()} by channels"
									>
										<TrophyIcon class="size-4" />
										#{section.rank.total_channels.toLocaleString()}
									</span>
								{/if}
							</div>

							{#if section.summary}
								<p class="text-dim truncate text-sm" title={summaryLine(section)}>{summaryLine(section)}</p>
							{:else if view === "user"}
								<Skeleton class="my-0.5 h-4 w-full" />
							{/if}
						</div>

						{#if section.error}
							<Panel class="p-3">
								<p class="text-warn text-sm">{section.error}</p>
							</Panel>
						{:else}
							<Panel class="min-h-0 flex-1 overflow-hidden p-1.5">
								<!-- pages in the next 100 as the bottom comes into view, so there is no button to press -->
								<VirtualList
									itemCount={section.rows.length + (section.loading ? skeletonRows(section) : 0)}
									itemSize={rowHeight}
									text={(index) => rowText(section, index)}
									class="overscroll-contain"
									onscroll={({ distanceFromBottom }) => {
										if (distanceFromBottom < 600 && section.cursor) loadPage(sectionIndex, section.cursor);
									}}
								>
									{#snippet item(index, style)}
										{@const row = section.rows[index]}
										{#if !row}
											<div class="flex w-full items-center gap-2.5 px-2" {style}>
												<Skeleton class="size-7 shrink-0 rounded-sm" />
												<Skeleton class="h-4 min-w-0 flex-1" />
											</div>
										{:else}
											<div
												class={["group hover:bg-raised flex w-full items-center gap-2.5 rounded-md px-2 transition-colors", row.active === false && "opacity-60"]}
												title={rowTitle(row)}
												{style}
											>
												{#if row.avatar}
													<Image src={row.avatar} alt="" class="size-7 shrink-0 rounded-sm" />
												{:else}
													<div class="bg-raised size-7 shrink-0 rounded-sm"></div>
												{/if}

												<div class="flex min-w-0 flex-1 items-center gap-0.5">
													<!-- the pseudo-element stretches this link over the row, so the whole row is one target without nesting anchors -->
													<a
														href="/roles?u={row.login}&v={view}"
														onclick={(event) => rowClick(event, row.login)}
														class="ring-focus truncate text-base after:absolute after:inset-0"
													>
														{row.displayName || row.login}
													</a>

													{#if row.isPartner}
														<BadgeCheckIcon class="text-raised fill-accent size-5 shrink-0" />
													{:else if row.isAffiliate}
														<DiamondIcon class="fill-accent size-3 shrink-0 text-transparent" />
													{/if}

													<!-- the name is a label rather than sr-only text: clipped text is still text, and find-in-page would match the row twice -->
													<a
														href="https://www.twitch.tv/{row.login}"
														target="_blank"
														rel="nofollow"
														aria-label="Open {row.login} on Twitch"
														data-umami-event="link-Twitch-channel"
														class="ring-focus text-dim hover:text-accent relative grid size-6 shrink-0 place-items-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
													>
														<ExternalLinkIcon class="size-4" />
													</a>
												</div>

												<!-- {#if row.active === false}
													<span class="font-display border-warn/40 text-warn hidden shrink-0 rounded-md border px-1.5 py-0.5 text-sm font-medium @[22rem]:inline"
														>Revoked</span
													>
												{/if} -->

												<span class="text-dim hidden w-14 shrink-0 items-center gap-1 text-xs tabular-nums @[17rem]:flex">
													<UsersIcon class="size-3 shrink-0" />
													{compactNumber(row.followers ?? 0)}
												</span>

												<span class="text-dim hidden shrink-0 text-right text-xs tabular-nums @[22rem]:block">
													{row.grantedAt ? dayjs(row.grantedAt).format(dateFormat) : "—"}
												</span>
											</div>
										{/if}
									{/snippet}
								</VirtualList>
							</Panel>
						{/if}
					</section>
				{/if}
			{/each}
		</div>
	{/if}
</div>
