import type { Reroute } from "@sveltejs/kit";

export const reroute: Reroute = ({ url }) => {
	return url.pathname.toLowerCase();
};
