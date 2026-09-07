type Emote = {
	id: string;
	name?: string;
	code?: string;
};

type Badge = {
	set_id: string;
	versions: {
		id: string;
		image_url_1x: string;
		image_url_2x: string;
		image_url_4x: string;
		title: string;
		description: string;
		click_action: null | string;
		click_url: null | string;
	}[];
};

type User = {
	id: string;
	login: string;
	displayName: string;
	banned: boolean;
	bio: string | null;
	followers: number | null;
	chatColor: string | null;
	logo: string | null;
	createdAt: string | null;
	verifiedBot: boolean | null;
	roles: {
		isAffiliate: boolean;
		isPartner: boolean;
		isStaff: boolean | null;
	};
};

// a sub period, open-ended in `streak` and lifetime-to-date in `cumulative`
type SubPeriod = {
	months: number;
	start: string;
	end: string;
};

type SubAge = {
	// a viewer can hide their subscription status, which nulls both periods
	statusHidden: boolean | null;
	followedAt: string | null;
	streak: SubPeriod | null;
	cumulative: SubPeriod | null;
};

// one entry per login the account has chatted under
type NameChange = {
	user_login: string;
	first_timestamp: string;
	last_timestamp: string;
};

export type { Emote, Badge, User, SubAge, NameChange };
