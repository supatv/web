import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
	const res = await fetch("https://api-tv.supa.sh/users");
	if (!res.ok) {
		throw error(res.status, `Failed to load users: ${res.statusText}`);
	}

	return {
		users: await res.json(),
	};
};
