import { type Component } from "svelte";
import { SvelteMap } from "svelte/reactivity";

import linkParser from "$lib/link-parser";

import Emote from "$lib/components/message/emote.svelte";
import Link from "$lib/components/message/link.svelte";
import Reply from "$lib/components/message/reply.svelte";
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

type TMIEmote = {
	id: string;
	pos: number[];
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
		const badges: MessageBadge[] = [];

		for (const badge of (msg.tags["badges"] ?? "").split(",")) {
			const [id, version] = badge.split("/");
			const key = `${id}/${version}`;

			const props = this.channelBadges.get(key) ?? this.globalBadges.get(key);
			if (props) badges.push({ id, src: props.url, title: props.title });
		}

		return badges;
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
		const components: ChatComponents = [];

		// native emote positions are codepoint offsets into the *rendered* line, which
		// a system message (sub notice, raid, …) prefixes ahead of the user's own text
		const systemMsg = msg.tags["system-msg"];
		const posOffset = systemMsg ? [...systemMsg].length + 1 : 0;

		const twitchEmotes: TMIEmote[] = [];
		if (msg.tags["emotes"]) {
			for (const entry of msg.tags["emotes"].split("/")) {
				const [id, positions] = entry.split(":");
				for (const pos of positions.split(",")) {
					twitchEmotes.push({ id, pos: pos.split("-").map((s) => Number(s) + posOffset) });
				}
			}
			twitchEmotes.sort((a, b) => a.pos[0] - b.pos[0]);
		}

		let word = "";
		const unicode = [...msg.text];
		for (let i = 0; i < unicode.length; i++) {
			const nextEmote = twitchEmotes[0];
			if (nextEmote?.pos[0] === i) {
				twitchEmotes.shift();
				components.push({
					type: Emote,
					props: {
						class: this.#emoteClass,
						name: unicode.slice(nextEmote.pos[0], nextEmote.pos[1] + 1).join(""),
						src: `https://static-cdn.jtvnw.net/emoticons/v2/${nextEmote.id}/default/dark/1.0`,
						url: `https://emotes.susgee.dev/emote/${nextEmote.id}`,
					},
				});
				i = nextEmote.pos[1];
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

		if (msg.tags["reply-parent-msg-id"]) {
			components[0] = {
				type: Reply,
				props: {
					text: `@${msg.tags["reply-parent-user-login"]}`,
					replyUser: msg.tags["reply-parent-user-login"],
					replyBody: msg.tags["reply-parent-msg-body"],
				},
			};
		}

		return components;
	}
}
