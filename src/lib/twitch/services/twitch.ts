import type { Badge } from "./common";

export default {
	getChannelBadges: async (channelId: string): Promise<Badge[]> => {
		const res = await fetch(`https://api.ivr.fi/v2/twitch/badges/channel?id=${encodeURIComponent(channelId)}`, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) {
			throw new Error("Failed fetching Twitch channel badges", { cause: res });
		}

		const badges = await res.json();
		return badges || [];
	},
	getGlobalBadges: async (): Promise<Badge[]> => {
		const res = await fetch(`https://api.ivr.fi/v2/twitch/badges/global`, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) {
			throw new Error("Failed fetching Twitch global badges", { cause: res });
		}

		const badges = await res.json();
		return badges || [];
	},
};
