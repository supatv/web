import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { User } from "$lib/twitch/streams";

export const load: PageLoad = async ({ params }) => {
    const res = await fetch(`https://api-tv.supa.sh/user?login=${encodeURIComponent(params.channel)}`);
    if (!res.ok) {
        throw error(res.status, `Failed to load user: ${res.statusText}`);
    }

    const user: User = await res.json();

    return { user };
};
