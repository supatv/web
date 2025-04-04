import type { Emote } from "./common";

export default {
	getChannelEmotes: async (channelId: string): Promise<Emote[]> => {
		const res = await fetch(`https://api.frankerfacez.com/v1/room/id/${encodeURIComponent(channelId)}`, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) {
			throw new Error("Failed fetching FrankerFaceZ channel emotes", { cause: res });
		}

		const data = await res.json();
		const ffzSet = Object.values(data.sets)[0] as { emoticons?: Emote[] } | undefined;
		return ffzSet?.emoticons || [];
	},
	getGlobalEmotes: async (): Promise<Emote[]> => {
		const res = await fetch(`https://api.frankerfacez.com/v1/set/global`, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) {
			throw new Error("Failed fetching FrankerFaceZ global emotes", { cause: res });
		}

		const data = await res.json();
		const emotes = data.default_sets.flatMap((id: number) => data.sets[id]?.emoticons ?? []) as Emote[];
		return emotes || [];
	},
};
