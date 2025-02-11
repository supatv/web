type BTTVEmote = {
    id: string;
    code: string;
    [key: string]: any;
}

export default {
    getChannelEmotes: async (channelId: string): Promise<BTTVEmote[]> => {
        const res = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${encodeURIComponent(channelId)}`, { signal: AbortSignal.timeout(10000) });
        if (~~(res.status / 100) !== 2) {
            throw new Error("Failed fetching BetterTTV channel emotes", { cause: res });
        }

        const bttvData = await res.json();
        return (bttvData?.channelEmotes || []).concat(bttvData?.sharedEmotes || [])
    },
    getGlobalEmotes: async (): Promise<BTTVEmote[]> => {
        const res = await fetch(`https://api.betterttv.net/3/cached/emotes/global`, { signal: AbortSignal.timeout(10000) });
        if (~~(res.status / 100) !== 2) {
            throw new Error("Failed fetching BetterTTV global emotes", { cause: res });
        }

        const emotes = await res.json();
        return emotes || [];
    }
}