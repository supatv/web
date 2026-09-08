import { BanIcon, CrownIcon, FlameIcon, GemIcon, GiftIcon, HeartHandshakeIcon, HighlighterIcon, InfoIcon, MegaphoneIcon, ShieldIcon, StarIcon, SwordsIcon, TimerIcon, type LucideIcon } from "@lucide/svelte";

import type { Message } from "$lib/twitch/chat.svelte";

export type NoticeTone = "accent" | "signal" | "warn" | "dim";

export type NoticeChip = {
	text: string;
	href?: string;
	event?: string;
};

/**
 * A row that is not a chatter's own line: a mod action, a sub, a raid, an announcement.
 *
 * `title` is Twitch's own wording and renders as plain text — nothing in it is looked up as an
 * emote or a link, so a timed-out user whose name reads as either is left alone. `body` says
 * whether the chatter's message follows the notice; that part, and only that part, is what
 * `ChatSource.parse` sees.
 */
export type Notice = {
	icon: LucideIcon;
	label: string;
	tone: NoticeTone;
	title: string;
	// the chatter the title opens with, drawn in their own color the way a message row draws it
	actor?: string;
	chips: NoticeChip[];
	author: boolean;
	body: boolean;
};

export const noticeStyle: Record<NoticeTone, { text: string; chip: string; row: string }> = {
	accent: { text: "text-accent", chip: "border-accent/40", row: "bg-accent/10 shadow-[inset_2px_0_0_var(--accent)]" },
	signal: { text: "text-signal", chip: "border-signal/40", row: "bg-signal/10 shadow-[inset_2px_0_0_var(--signal)]" },
	warn: { text: "text-warn", chip: "border-warn/40", row: "bg-warn/10 shadow-[inset_2px_0_0_var(--warn)]" },
	dim: { text: "text-dim", chip: "border-line", row: "" },
};

type NoticeInit = Partial<Notice> & Pick<Notice, "icon" | "label" | "tone">;

const build = (notice: NoticeInit): Notice => ({ title: "", chips: [], author: false, body: false, ...notice });

const humanDuration = (total: number) => {
	const parts: string[] = [];
	let rest = total;

	for (const [size, suffix] of [
		[86400, "d"],
		[3600, "h"],
		[60, "m"],
		[1, "s"],
	] as const) {
		const value = Math.floor(rest / size);
		if (value) parts.push(`${value}${suffix}`);
		rest -= value * size;
	}

	// a 20851 second timeout reads as "5h 47m"; the tail of it is noise
	return parts.slice(0, 2).join(" ") || "0s";
};

const describe = (msg: Message): Notice | null => {
	const tags = msg.tags;
	// BestLogs carries the colon that opens the raw IRC trailer over into the target's name
	const actor = (msg.displayName || "").replace(/^:/, "");
	// for the notices whose wording Twitch opens with the name; the rest draw it themselves
	const named = (notice: NoticeInit) => build({ actor, ...notice });

	if (tags["target-user-id"]) {
		const duration = Number(tags["ban-duration"]);

		return duration
			? named({ icon: TimerIcon, label: "Timeout", tone: "dim", title: actor ? `${actor} has been timed out for ${humanDuration(duration)}` : msg.text })
			: named({ icon: BanIcon, label: "Ban", tone: "dim", title: actor ? `${actor} has been banned` : msg.text });
	}

	const bits = Number(tags["bits"]);
	if (bits) return build({ icon: GemIcon, label: "Cheer", tone: "warn", chips: [{ text: `${bits.toLocaleString()} bits` }], author: true, body: true });

	if (tags["msg-id"] === "announcement") return build({ icon: MegaphoneIcon, label: "Announcement", tone: "accent", title: "Announcement", author: true, body: true });
	if (tags["msg-id"] === "highlighted-message") return build({ icon: HighlighterIcon, label: "Highlighted message", tone: "accent", author: true, body: true });

	const system = tags["system-msg"];
	if (!system) return actor ? null : named({ icon: InfoIcon, label: "Notice", tone: "dim", title: msg.text });

	const chips: NoticeChip[] = [];
	const count = (tag: string) => Number(tags[tag]) || 0;

	switch (tags["msg-id"]) {
		case "sub":
		case "resub": {
			// how many months were bought up front, and whether the sub was a gift, are the two
			// things the system message never says
			const months = count("msg-param-multimonth-duration");
			if (months > 1) chips.push({ text: `${months}-month sub` });
			if (tags["msg-param-was-gifted"] === "true") chips.push({ text: "gifted" });

			return named({ icon: StarIcon, label: "Subscription", tone: "signal", title: system, chips, body: true });
		}

		case "primepaidupgrade":
		case "giftpaidupgrade":
		case "anongiftpaidupgrade":
			return named({ icon: CrownIcon, label: "Subscription", tone: "signal", title: system, body: true });

		case "subgift":
		case "anonsubgift":
		case "submysterygift":
		case "standardpayforward":
		case "communitypayforward": {
			const months = count("msg-param-gift-months");
			if (months > 1) chips.push({ text: `${months} months` });

			const gifted = count("msg-param-sender-count");
			if (gifted) chips.push({ text: `${gifted.toLocaleString()} gifted total` });

			return named({ icon: GiftIcon, label: "Gift subscription", tone: "signal", title: system, chips, body: true });
		}

		case "raid": {
			const login = tags["msg-param-login"];
			if (login) chips.push({ text: `twitch.tv/${login}`, href: `https://www.twitch.tv/${login}`, event: "link-Twitch-channel" });

			return named({ icon: SwordsIcon, label: "Raid", tone: "accent", title: system, chips, body: true });
		}

		case "modiversary":
			// Twitch's wording for this one opens on the verb, so the name has to be put back
			return named({ icon: ShieldIcon, label: "Mod anniversary", tone: "signal", title: actor ? `${actor} ${system}` : system, body: true });

		case "viewermilestone":
			return named({ icon: FlameIcon, label: "Milestone", tone: "signal", title: system, body: true });

		case "charitydonation":
			return named({ icon: HeartHandshakeIcon, label: "Charity donation", tone: "warn", title: system, body: true });

		default:
			return named({ icon: InfoIcon, label: "Notice", tone: "signal", title: system, body: true });
	}
};

// same reason as the parse cache in ChatSource: a virtualised row asks for this on every scroll tick
const notices = new WeakMap<Message, Notice | null>();

export const messageNotice = (msg: Message): Notice | null => {
	const cached = notices.get(msg);
	if (cached !== undefined) return cached;

	const notice = describe(msg);
	notices.set(msg, notice);
	return notice;
};
