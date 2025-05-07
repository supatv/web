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
	channel: "channel:",
	username: "username:",
	user: "user:",
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
		const channel = searchValue.slice(searchPrefixes.channel.length).toLowerCase();

		chatLogs = chatLogs.filter((msg) => msg.channel?.toLowerCase() === channel);
	} else if (searchValue.startsWith(searchPrefixes.username) || searchValue.startsWith(searchPrefixes.user)) {
		const user = searchValue.startsWith(searchPrefixes.username)
			? searchValue.slice(searchPrefixes.username.length).toLowerCase()
			: searchValue.slice(searchPrefixes.user.length).toLowerCase();

		chatLogs = chatLogs.filter((msg) => msg.displayName.toLowerCase() === user);
	} else if (searchValue) {
		const searchOptions = scrollFromBottom === null ? { keys: ["channel", "displayName", "text"], threshold: 0.5 } : { keys: ["text"], threshold: 0.5, limit: 5000 };

		chatLogs = fuzzysort
			.go(searchValue, chatLogs, searchOptions)
			.map((x) => x.obj)
			.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
	}

	return scrollFromBottom === false ? [...chatLogs].reverse() : chatLogs;
};

