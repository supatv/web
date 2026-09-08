import type { Badge, SubAge, User } from "./common";

const getUsers = async (userIds: string[]): Promise<User[]> => {
	if (!userIds.length) return [];

	const res = await fetch(`https://api.ivr.fi/v2/twitch/user?id=${userIds.map(encodeURIComponent).join(",")}`, { signal: AbortSignal.timeout(10000) });
	if (!res.ok) {
		throw new Error("Failed fetching Twitch users", { cause: res });
	}

	return res.json();
};

export default {
	getUsers,
	// ids that resolved to nothing are dropped from the response rather than 404ing
	getUser: async (userId: string): Promise<User | null> => (await getUsers([userId]))[0] ?? null,
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
