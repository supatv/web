<script lang="ts">
	import { Button, Input, Label, Popover } from "$lib/components/ui";

	import { CheckIcon, EraserIcon, SlidersHorizontalIcon, XIcon } from "@lucide/svelte";

	import { untrack } from "svelte";

	import { cn } from "$lib/utils";

	import { buildQuery, parseQuery, type FilterKey, type QueryTerm } from "$lib/twitch/search";

	type Props = {
		value: string;
		// /firehose spans every channel; a single log has nothing to narrow with `in:`
		channels?: boolean;
		size?: "icon" | "icon-sm";
		class?: string;
	};

	let { value = $bindable(""), channels = false, size = "icon", class: className }: Props = $props();

	// a chip cycles off -> included -> excluded, so the menu can hide a kind of message as well as
	// ask for one. the included flags of a key collapse into one OR'd term, the excluded into another
	type Flag = "off" | "on" | "not";

	type Chip = {
		key: Extract<FilterKey, "has" | "is">;
		flag: string;
		label: string;
	};

	const chips: Chip[] = [
		{ key: "has", flag: "link", label: "Link" },
		{ key: "has", flag: "emote", label: "Emote" },
		{ key: "has", flag: "mention", label: "Mention" },
		{ key: "is", flag: "reply", label: "Reply" },
		{ key: "is", flag: "first-msg", label: "First message" },
		{ key: "is", flag: "sub", label: "Subscription" },
		{ key: "is", flag: "gift", label: "Gift" },
		{ key: "is", flag: "cheer-msg", label: "Cheer" },
		{ key: "is", flag: "raid", label: "Raid" },
		{ key: "is", flag: "announcement", label: "Announcement" },
		{ key: "is", flag: "highlighted", label: "Highlighted" },
		{ key: "is", flag: "redemption", label: "Redemption" },
		{ key: "is", flag: "timeout", label: "Timeout or ban" },
		{ key: "is", flag: "deleted", label: "Deleted" },
		{ key: "is", flag: "notice", label: "Notice" },
	];

	const tiers = [
		{ value: "1", label: "Tier 1" },
		{ value: "2", label: "Tier 2" },
		{ value: "3", label: "Tier 3" },
		{ value: "prime", label: "Prime" },
	];

	type Field = { value: string; negate: boolean };

	type Form = {
		from: Field;
		in: Field;
		badge: Field;
		regex: Field;
		subtier: string[];
		flags: Record<string, Flag>;
		text: string;
	};

	const listed = (value: string) =>
		value
			.toLowerCase()
			.split(",")
			.map((entry) => entry.trim());

	// a query typed by hand can repeat a key; the menu shows one field per key, so the values it
	// found join back into that field — except a regex, which would not survive being spliced
	const field = (terms: QueryTerm[], key: FilterKey, list = true): Field => {
		const found = terms.filter((term) => term.key === key);
		return { value: list ? found.map((term) => term.value).join(",") : (found[0]?.value ?? ""), negate: found.some((term) => term.negate) };
	};

	const toForm = (query: string): Form => {
		const { terms, text } = parseQuery(query);

		const flags: Record<string, Flag> = {};
		for (const { key, flag } of chips) {
			const term = terms.find((term) => term.key === key && listed(term.value).includes(flag));
			flags[`${key}:${flag}`] = term ? (term.negate ? "not" : "on") : "off";
		}

		const subtier = field(terms, "subtier").value;

		return {
			from: field(terms, "from"),
			in: field(terms, "in"),
			badge: field(terms, "badge"),
			regex: field(terms, "regex", false),
			subtier: subtier ? listed(subtier).filter(Boolean) : [],
			flags,
			text,
		};
	};

	const fromForm = (form: Form): string => {
		const terms: QueryTerm[] = [];

		const push = (key: FilterKey, { value, negate }: Field) => {
			if (value.trim()) terms.push({ key, value: value.trim(), negate });
		};

		push("from", form.from);
		if (channels) push("in", form.in);
		push("badge", form.badge);
		if (form.subtier.length) terms.push({ key: "subtier", value: form.subtier.join(","), negate: false });

		for (const key of ["has", "is"] as const) {
			for (const state of ["on", "not"] as const) {
				const flags = chips.filter((chip) => chip.key === key && form.flags[`${key}:${chip.flag}`] === state).map((chip) => chip.flag);
				if (flags.length) terms.push({ key, value: flags.join(","), negate: state === "not" });
			}
		}

		push("regex", form.regex);

		return buildQuery({ terms, text: form.text });
	};

	let form = $state(toForm(""));

	// the input beside the menu writes the same query, so the form follows it whenever the two have
	// drifted apart — never while an edit in here is what moved it, which would fight the caret
	$effect(() => {
		const query = value;
		untrack(() => {
			if (fromForm(form) !== query) form = toForm(query);
		});
	});

	const apply = () => (value = fromForm(form));

	const cycle = (chip: Chip) => {
		const key = `${chip.key}:${chip.flag}`;
		form.flags[key] = form.flags[key] === "off" ? "on" : form.flags[key] === "on" ? "not" : "off";
		apply();
	};

	const toggleTier = (tier: string) => {
		form.subtier = form.subtier.includes(tier) ? form.subtier.filter((entry) => entry !== tier) : [...form.subtier, tier];
		apply();
	};

	const clear = () => {
		form = toForm("");
		value = "";
	};

	const active = $derived(parseQuery(value).terms.length);
</script>

{#snippet text(id: string, label: string, placeholder: string, current: Field)}
	<div class="flex flex-col gap-1">
		<Label for={id}>{label}</Label>
		<div class="flex items-center gap-1">
			<Input
				{id}
				size="sm"
				{placeholder}
				autocomplete="off"
				spellcheck="false"
				value={current.value}
				oninput={(event) => {
					current.value = event.currentTarget.value;
					apply();
				}}
			/>
			<Button
				variant="outline"
				size="icon-sm"
				title="Exclude matches"
				aria-label="Exclude matches"
				aria-pressed={current.negate}
				class="on:border-warn on:text-warn font-mono"
				onclick={() => {
					current.negate = !current.negate;
					apply();
				}}
			>
				!
			</Button>
		</div>
	</div>
{/snippet}

{#snippet toggle(label: string, state: Flag, onclick: () => void)}
	<button
		type="button"
		aria-pressed={state !== "off"}
		aria-label={state === "not" ? `${label} (excluded)` : undefined}
		class={[
			"ring-focus inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-sm transition-colors select-none",
			state === "on" && "border-accent text-accent",
			state === "not" && "border-warn text-warn",
			state === "off" && "border-line text-dim hover:border-accent hover:text-text",
		]}
		{onclick}
	>
		{#if state === "on"}
			<CheckIcon class="size-3.5" />
		{:else if state === "not"}
			<XIcon class="size-3.5" />
		{/if}
		{label}
	</button>
{/snippet}

<Popover class="max-h-[60vh] w-90 max-w-[calc(100vw-2rem)] overflow-y-auto p-4" align="end">
	{#snippet trigger({ props })}
		<Button {...props} variant="outline" {size} title="Advanced filters" aria-label={active ? `Advanced filters (${active} active)` : "Advanced filters"} class={cn("relative", className)}>
			<SlidersHorizontalIcon />
			{#if active}
				<span aria-hidden="true" class="bg-accent text-accent-ink font-display absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full text-[10px] font-semibold tabular-nums">
					{active}
				</span>
			{/if}
		</Button>
	{/snippet}

	<div class="flex flex-col gap-3">
		{@render text("filter-from", "Users", "comma, separated", form.from)}
		{#if channels}
			{@render text("filter-in", "Channels", "comma, separated", form.in)}
		{/if}

		<div class="flex flex-col gap-1.5">
			<Label>Message</Label>
			<div class="flex flex-wrap gap-1">
				{#each chips as chip (chip.key + chip.flag)}
					{@render toggle(chip.label, form.flags[`${chip.key}:${chip.flag}`], () => cycle(chip))}
				{/each}
			</div>
			<p class="text-dim/70 text-xs">Click a chip again to exclude it.</p>
		</div>

		<div class="flex flex-col gap-1.5">
			<Label>Subscription tier</Label>
			<div class="flex flex-wrap gap-1">
				{#each tiers as tier (tier.value)}
					{@render toggle(tier.label, form.subtier.includes(tier.value) ? "on" : "off", () => toggleTier(tier.value))}
				{/each}
			</div>
		</div>

		{@render text("filter-badge", "Badges", "moderator, vip, ...", form.badge)}
		{@render text("filter-regex", "Regex", "^\\w+$", form.regex)}

		<Button variant="ghost" size="sm" class="self-end" onclick={clear}>
			<EraserIcon />
			Clear
		</Button>
	</div>
</Popover>
