export const roleNames = ["artists", "founders", "moderators", "vips", "subscribers"] as const;

export type RoleName = (typeof roleNames)[number];

// `user` lists the channels an account holds a role in, `channel` lists the accounts holding it in theirs
export type RolesView = "user" | "channel";

export type RoleCounts = Record<RoleName, number>;

export type RoleUser = {
	id: string;
	login: string;
	displayName?: string | null;
	chatColor?: string | null;
	description?: string | null;
	language?: string | null;
	avatar?: string | null;
	followers?: number | null;
	createdAt?: string | null;
	updatedAt?: string | null;
	grantedAt?: string | null;
	active?: boolean | null;
	isBanned?: boolean;
	isCollaborator?: boolean;
	isAffiliate?: boolean;
	isPartner?: boolean;
	isStaff?: boolean | null;
	isBot?: boolean;
	roles?: RoleCounts | null;
};

export type RolesPage = {
	total: number;
	page: number;
	pages: number;
	perPage: number;
	cursor: string | null;
	data: RoleUser[];
};

export type RoleSummary = {
	user?: RoleUser | null;
	channels: number;
	staff: number;
	partners: number;
	affiliates: number;
	channelsTotalFollowers: number;
};

export type RoleRanking = {
	user?: RoleUser | null;
	total_channels: number;
	partners: number;
	affiliates: number;
	followers: number;
};

export type GlobalStats = Record<"users" | "bots" | "staff" | "partners" | "affiliates" | RoleName, { count: number }>;

export type RoleTarget = { param: "login" | "id"; value: string };

export const parseTarget = (input: string): RoleTarget => {
	const value = input.trim();
	return value.toLowerCase().startsWith("id:") ? { param: "id", value: value.slice(3).trim() } : { param: "login", value: value.toLowerCase() };
};

const targetPath = ({ param, value }: RoleTarget) => `${param}/${encodeURIComponent(value)}`;

const request = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
	const timeout = AbortSignal.timeout(60000);
	const res = await fetch(`https://roles.tv/api${path}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
	if (!res.ok) {
		const reason = await res
			.json()
			.then((body) => body?.error as string | undefined)
			.catch(() => undefined);

		throw new Error(reason || `Failed fetching ${path}`, { cause: res });
	}

	return res.json();
};

export default {
	getStats: (signal?: AbortSignal): Promise<GlobalStats> => request<{ data: GlobalStats }>("/stats", signal).then((body) => body.data),

	getUser: (view: RolesView, target: RoleTarget, signal?: AbortSignal): Promise<RoleUser> => request<{ data: RoleUser }>(`/${view}/${targetPath(target)}`, signal).then((body) => body.data),

	getSummary: (role: RoleName, target: RoleTarget, signal?: AbortSignal): Promise<RoleSummary> =>
		request<{ data: RoleSummary }>(`/summary/${role}/${targetPath(target)}`, signal).then((body) => body.data),

	getRank: (role: RoleName, target: RoleTarget, signal?: AbortSignal): Promise<RoleRanking> =>
		request<{ data: RoleRanking }>(`/rank/${role}/${targetPath(target)}`, signal).then((body) => body.data),

	getRoleList: async (view: RolesView, role: RoleName, target: RoleTarget, options: { after?: string | null; includeInactive?: boolean } = {}, signal?: AbortSignal): Promise<RolesPage> => {
		const query = new URLSearchParams({ per_page: "100" });
		if (options.after) query.set("after", options.after);
		if (options.includeInactive) query.set("include_inactive", "true");

		const result = await request<Omit<RolesPage, "data"> & { data?: RoleUser[] }>(`/stats/${view}/${role}/${targetPath(target)}?${query}`, signal);

		// a result with no rows omits `data` entirely rather than sending an empty array
		return { ...result, data: result.data ?? [] };
	},
};
