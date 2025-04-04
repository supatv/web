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

export type { Emote, Badge };
