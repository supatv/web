import { type Component } from "svelte";
import { SvelteMap } from "svelte/reactivity";

import linkParser from "$lib/link-parser";

import Emote from "$lib/components/message/emote.svelte";
import Link from "$lib/components/message/link.svelte";
import TextFragment from "$lib/components/message/text-fragment.svelte";

import * as TwitchServices from "$lib/twitch/services/index.js";
import type { Badge as TwitchBadge, Emote as ServiceEmote } from "$lib/twitch/services/common";

export type Message = {
	text: string;
	displayName: string;
	channel?: string;
	timestamp: string;
	id: string;
	tags: {
		[key: string]: string;
	};
};

// the chatter a row names, as the user card takes them: a ban or timeout row is drawn under the
// name of the user it removed rather than the moderator who ran it, so the target's id wins
export type ChatUser = {
	id: string;
	name: string;
	channel?: string;
};

export type ChatComponents = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type: Component<any>;
	props: object;
}[];

export type EmoteProps = {
	url: string;
	src: string;
};

export type BadgeProps = {
	url: string;
	title: string;
};

export type MessageBadge = {
	id: string;
	src: string;
	title: string;
};

// a native emote or a gif, keyed by its codepoint range in the message text
type Span = {
	pos: number[];
	render: (text: string) => ChatComponents[number];
};

const settled = <T>(requests: Promise<T[]>[]) => Promise.allSettled(requests).then((results) => results.map((r) => (r.status === "fulfilled" ? r.value : [])));

/**
 * Emote and badge tables shared by every chat view, plus the raw-IRC-message to
 * component-list pipeline that renders against them.
 *
 * The tables fill in asynchronously long after a message is first drawn, and
 * `parse`/`badges` are plain functions called from markup rather than `$derived`,
 * so nothing re-renders on its own. `emoteVersion`/`badgeVersion` bump after every
 * load; wrap the render in `{#key}` on them to pick the new tables up.
 */
export class ChatSource {
	readonly channelEmotes = new SvelteMap<string, EmoteProps>();
	readonly globalEmotes = new SvelteMap<string, EmoteProps>();
	readonly channelBadges = new SvelteMap<string, BadgeProps>();
	readonly globalBadges = new SvelteMap<string, BadgeProps>();

	emoteVersion = $state(0);
	badgeVersion = $state(0);

	// counted outside the runes so bumping never reads the signal it writes,
	// which would make any `$effect` that loads a table depend on its own write
	#emoteTicks = 0;
	#badgeTicks = 0;

	// a virtualised row re-runs `parse`/`badges` for every message on screen on every
	// scroll tick, so hold the results until the tables underneath them actually change
	#parsed = new WeakMap<Message, ChatComponents>();
	#parsedAt = -1;
	#badged = new WeakMap<Message, MessageBadge[]>();
	#badgedAt = -1;

	readonly #emoteClass: string;

	constructor({ emoteClass = "" }: { emoteClass?: string } = {}) {
		this.#emoteClass = emoteClass;
	}

	#addEmotes(target: SvelteMap<string, EmoteProps>, [stv, bttv, ffz]: ServiceEmote[][]) {
		for (const emote of stv) {
			target.set(emote.name!, {
				url: `https://7tv.app/emotes/${emote.id}`,
				src: `https://cdn.7tv.app/emote/${emote.id}/1x.webp`,
			});
		}

		for (const emote of bttv) {
			target.set(emote.code!, {
				url: `https://betterttv.com/emotes/${emote.id}`,
				src: `https://cdn.betterttv.net/emote/${emote.id}/1x.webp`,
			});
		}

		for (const emote of ffz) {
			target.set(emote.name!, {
				url: `https://www.frankerfacez.com/emoticon/${emote.id}-${emote.name}`,
				src: `https://cdn.frankerfacez.com/emote/${emote.id}/1`,
			});
		}

		this.emoteVersion = ++this.#emoteTicks;
	}

	#addBadges(target: SvelteMap<string, BadgeProps>, badges: TwitchBadge[]) {
		for (const badge of badges) {
			for (const version of badge.versions) {
				target.set(`${badge.set_id}/${version.id}`, {
					url: version.image_url_1x,
					title: version.title,
				});
			}
		}

		this.badgeVersion = ++this.#badgeTicks;
	}

	async loadGlobalEmotes() {
		this.#addEmotes(this.globalEmotes, await settled([TwitchServices.SevenTV.getGlobalEmotes(), TwitchServices.BetterTTV.getGlobalEmotes(), TwitchServices.FrankerFaceZ.getGlobalEmotes()]));
	}

	async loadChannelEmotes(channelId: string) {
		this.channelEmotes.clear();
		this.emoteVersion = ++this.#emoteTicks;
		if (!channelId) return;

		this.#addEmotes(
			this.channelEmotes,
			await settled([TwitchServices.SevenTV.getChannelEmotes(channelId), TwitchServices.BetterTTV.getChannelEmotes(channelId), TwitchServices.FrankerFaceZ.getChannelEmotes(channelId)])
		);
	}

	async loadGlobalBadges() {
		const [badges] = await settled([TwitchServices.IVR.getGlobalBadges()]);
		this.#addBadges(this.globalBadges, badges);
	}

	async loadChannelBadges(channelId: string) {
		this.channelBadges.clear();
		this.badgeVersion = ++this.#badgeTicks;
		if (!channelId) return;

		const [badges] = await settled([TwitchServices.IVR.getChannelBadges(channelId)]);
		this.#addBadges(this.channelBadges, badges);
	}

	badges(msg: Message): MessageBadge[] {
		if (this.#badgedAt !== this.#badgeTicks) {
			this.#badged = new WeakMap();
			this.#badgedAt = this.#badgeTicks;
		}

		const cached = this.#badged.get(msg);
		if (cached) return cached;

		const badges: MessageBadge[] = [];

		for (const badge of (msg.tags["badges"] ?? "").split(",")) {
			const [id, version] = badge.split("/");
			const key = `${id}/${version}`;

			const props = this.channelBadges.get(key) ?? this.globalBadges.get(key);
			if (props) badges.push({ id, src: props.url, title: props.title });
		}

		this.#badged.set(msg, badges);
		return badges;
	}

	#isText(component: ChatComponents[number] | undefined, matches: (text: string) => boolean) {
		return component?.type === TextFragment && matches((component.props as { text: string }).text);
	}

	#pushWord(components: ChatComponents, word: string) {
		const emote = this.channelEmotes.get(word) ?? this.globalEmotes.get(word);
		if (emote) {
			components.push({ type: Emote, props: { class: this.#emoteClass, name: word, ...emote } });
			return;
		}

		const url = linkParser.parse(word);
		if (url) {
			components.push({ type: Link, props: { href: `${url.protocol || "//"}${url.host}${url.rest}`, text: word } });
			return;
		}

		components.push({ type: TextFragment, props: { text: word } });
	}

	parse(msg: Message): ChatComponents {
		if (this.#parsedAt !== this.#emoteTicks) {
			this.#parsed = new WeakMap();
			this.#parsedAt = this.#emoteTicks;
		}

		const cached = this.#parsed.get(msg);
		if (cached) return cached;

		const components: ChatComponents = [];

		// a system message (sub notice, raid, …) is prefixed onto the text of the message it
		// came with; the notice renders it, and the emote positions are offsets into what
		// follows it, so parse the user's own text alone
		const systemMsg = msg.tags["system-msg"];
		const unicode = [...msg.text].slice(systemMsg ? [...systemMsg].length + 1 : 0);

		const spans: Span[] = [];

		if (msg.tags["emotes"]) {
			for (const entry of msg.tags["emotes"].split("/")) {
				const [id, positions] = entry.split(":");
				for (const pos of positions.split(",")) {
					spans.push({
						pos: pos.split("-").map(Number),
						render: (name) => ({
							type: Emote,
							props: {
								class: this.#emoteClass,
								name,
								src: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0`,
								url: `https://emotes.susgee.dev/emote/${id}`,
							},
						}),
					});
				}
			}
		}

		// gifs=<start>-<end>|<id>|<url>, where the range covers the `[title]` placeholder
		// Twitch leaves in the text; matched rather than split so a comma in a url only
		// costs that one entry its tail
		for (const [, start, end, href] of (msg.tags["gifs"] ?? "").matchAll(/(\d+)-(\d+)\|[^|]*\|([^,]+)/g)) {
			spans.push({ pos: [Number(start), Number(end)], render: (text) => ({ type: Link, props: { href, text } }) });
		}

		spans.sort((a, b) => a.pos[0] - b.pos[0]);

		let word = "";
		for (let i = 0; i < unicode.length; i++) {
			const next = spans[0];
			if (next?.pos[0] === i) {
				spans.shift();
				if (word.trim()) {
					this.#pushWord(components, word);
					word = "";
				}
				components.push(next.render(unicode.slice(next.pos[0], next.pos[1] + 1).join("")));
				i = next.pos[1];
				continue;
			}

			if (unicode[i] === " ") {
				if (word.trim()) {
					this.#pushWord(components, word);
					word = "";
				}
				components.push({ type: TextFragment, props: { text: " " } });
			} else {
				word += unicode[i];
			}

			if (i === unicode.length - 1 && word.trim()) {
				this.#pushWord(components, word);
			}
		}

		// a reply carries the parent author twice: as tags, and as an `@name ` prefix Twitch
		// splices into the text itself. The preview a row draws above the message says it, so
		// drop the prefix rather than repeat it
		if (msg.tags["reply-parent-msg-id"] && this.#isText(components[0], (text) => text.startsWith("@"))) {
			components.splice(0, this.#isText(components[1], (text) => text === " ") ? 2 : 1);
		}

		this.#parsed.set(msg, components);
		return components;
	}
}
