export type Stream = {
	uid: string;
	login: string;
	name: string;
	started: string;
	viewers: number;
	game: string;
	title: string;
	thumbnail?: string;
	avatar: string;
	platform: "twitch" | "kick";
	type?: string;
};
