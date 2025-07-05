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

const searchPrefixes: Record<string, (searchString: string, chatLogs: Message[]) => Message[]> = {
	regex(searchString, chatLogs) {
		try {
			const regex = new RegExp(searchString, "i");

			return chatLogs.filter((msg) => regex.test(msg.text));
		} catch {
			return [];
		}
	},
	in(searchString, chatLogs) {
		const channels = searchString
			.toLowerCase()
			.split(",")
			.map((c) => c.trim());

		return chatLogs.filter((msg) => channels.includes(msg.channel?.toLowerCase() ?? ""));
	},
	from(searchString, chatLogs) {
		const users = searchString
			.toLowerCase()
			.split(",")
			.map((u) => u.trim());

		return chatLogs.filter((msg) => users.includes(msg.displayName.toLowerCase()));
	},
};

type SearchPrefixKey = keyof typeof searchPrefixes;

export const messageSearch = (searchValue: string, chatLogs: Message[], scrollFromBottom: boolean | null): Message[] => {
	const searchKey = searchValue.split(":", 1)[0].toLowerCase();
	if (searchKey in searchPrefixes) {
		const searchString = searchValue.slice(searchKey.length + 1);
		chatLogs = searchPrefixes[searchKey as SearchPrefixKey](searchString, chatLogs);
	} else if (searchValue) {
		const searchOptions = scrollFromBottom === null ? { keys: ["channel", "displayName", "text"], threshold: 0.5 } : { keys: ["text"], threshold: 0.5, limit: 5000 };

		chatLogs = fuzzysort
			.go(searchValue, chatLogs, searchOptions)
			.map((x) => x.obj)
			.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
	}

	return scrollFromBottom === false ? [...chatLogs].reverse() : chatLogs;
};
