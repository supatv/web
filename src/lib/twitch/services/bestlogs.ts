import type { NameChange } from "./common";

export default {
	getNameHistory: async (userId: string): Promise<NameChange[]> => {
		const res = await fetch(`https://logs.zonian.dev/namehistory/${encodeURIComponent(userId)}`, { signal: AbortSignal.timeout(60000) });
		if (!res.ok) {
			throw new Error("Failed fetching Twitch name history", { cause: res });
		}

		const history = await res.json();
		return history || [];
	},
};
