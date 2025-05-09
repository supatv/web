import { type Component } from "svelte";
import fuzzysort from "fuzzysort";

export type Message = {
	text: string;
	displayName: string;
	channel?: string;
	timestamp: string;
	id: string;
	tags: {
		[key: string]: string;
	};
};

export type TMIEmote = {
	id: string;
	pos: number[];
};

export type ChatComponents = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type: Component<any>;
	props: object;
}[];

export type EmoteProps = {
	url: string;
	src: string;
};

const searchPrefixes = {
	regex: "regex:",
	channel: "in:",
	user: "from:",
};

export const messageSearch = (searchValue: string, chatLogs: Message[], scrollFromBottom: boolean | null): Message[] => {
	if (searchValue.startsWith(searchPrefixes.regex)) {
		try {
			const regex = new RegExp(searchValue.slice(searchPrefixes.regex.length), "i");

			chatLogs = chatLogs.filter((msg) => regex.test(msg.text));
		} catch {
			return [];
		}
	} else if (searchValue.startsWith(searchPrefixes.channel)) {
		const channels = searchValue
			.slice(searchPrefixes.channel.length)
			.toLowerCase()
			.split(",")
			.map((c) => c.trim());

		chatLogs = chatLogs.filter((msg) => channels.includes(msg.channel?.toLowerCase() ?? ""));
	} else if (searchValue.startsWith(searchPrefixes.user)) {
		const users = searchValue
			.slice(searchPrefixes.user.length)
			.toLowerCase()
			.split(",")
			.map((u) => u.trim());

		chatLogs = chatLogs.filter((msg) => users.includes(msg.displayName.toLowerCase()));
	} else if (searchValue) {
		const searchOptions = scrollFromBottom === null ? { keys: ["channel", "displayName", "text"], threshold: 0.5 } : { keys: ["text"], threshold: 0.5, limit: 5000 };

		chatLogs = fuzzysort
			.go(searchValue, chatLogs, searchOptions)
			.map((x) => x.obj)
			.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
	}

	return scrollFromBottom === false ? [...chatLogs].reverse() : chatLogs;
};
