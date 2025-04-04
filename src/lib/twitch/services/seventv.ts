import type { Emote } from "./common";

export default {
	getChannelEmotes: async (channelId: string): Promise<Emote[]> => {
		const res = await fetch(`https://7tv.io/v3/users/twitch/${encodeURIComponent(channelId)}`, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) {
			throw new Error("Failed fetching 7TV channel emotes", { cause: res });
		}

		const data = await res.json();
		return data.emote_set?.emotes ?? [];
	},
	getGlobalEmotes: async (): Promise<Emote[]> => {
		const res = await fetch(`https://7tv.io/v3/emote-sets/global`, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) {
			throw new Error("Failed fetching 7TV global emotes", { cause: res });
		}

		const data = await res.json();
		return data.emotes ?? [];
	},
};
