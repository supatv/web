import type { Badge, SubAge, User } from "./common";

export default {
	getUser: async (userId: string): Promise<User | null> => {
		const res = await fetch(`https://api.ivr.fi/v2/twitch/user?id=${encodeURIComponent(userId)}`, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) {
			throw new Error("Failed fetching Twitch user", { cause: res });
		}

		// the endpoint takes a list of ids, so a lookup that found nothing is an empty array rather than a 404
		const [user] = await res.json();
		return user ?? null;
	},
	// keyed by login rather than id: the numeric form of either resolves to an account named that
	getSubAge: async (userLogin: string, channelLogin: string): Promise<SubAge> => {
		const res = await fetch(`https://api.ivr.fi/v2/twitch/subage/${encodeURIComponent(userLogin)}/${encodeURIComponent(channelLogin)}`, { signal: AbortSignal.timeout(10000) });
		if (!res.ok) {
			throw new Error("Failed fetching Twitch sub age", { cause: res });
		}

		return res.json();
	},
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
