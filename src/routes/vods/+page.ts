import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    const res = await fetch("https://api-tv.supa.sh/users");
    if (~~(res.status / 100) !== 2) {
        throw error(res.status, res.status == 404 ? "User not found" : `Failed to load users: ${res.statusText}`);
    }

    return {
        users: await res.json()
    };
};
