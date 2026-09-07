import type { Message } from "./chat.svelte";

/**
 * Splits a log into the messages worth drawing and the ids a CLEARMSG in it removed. The row a
 * deletion arrives on carries no text of its own, so the note belongs on the message it names
 * ([message/deleted.svelte](../components/message/deleted.svelte)) rather than on a line of its own.
 */
export const splitDeletions = (messages: Message[]) => ({
	messages: messages.filter((msg) => !msg.tags["target-msg-id"]),
	deleted: new Set(messages.flatMap((msg) => msg.tags["target-msg-id"] ?? [])),
});

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

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let lastQuery: string | null = null;
let lastSource: Message[] | null = null;
let lastWithChannel = false;
let lastResult: Message[] = [];

const textSearch = (searchValue: string, chatLogs: Message[], withChannel: boolean): Message[] => {
	// appending to a query can only shrink the hit set, so narrow the previous results instead of rescanning everything
	const source = lastQuery !== null && lastSource === chatLogs && lastWithChannel === withChannel && searchValue.startsWith(lastQuery) ? lastResult : chatLogs;

	const matcher = new RegExp(escapeRegex(searchValue), "i");
	const result = withChannel
		? source.filter((msg) => matcher.test(msg.text) || matcher.test(msg.displayName) || matcher.test(msg.channel ?? ""))
		: source.filter((msg) => matcher.test(msg.text) || matcher.test(msg.displayName));

	lastQuery = searchValue;
	lastSource = chatLogs;
	lastWithChannel = withChannel;
	lastResult = result;

	return result;
};

export const messageSearch = (searchValue: string, chatLogs: Message[], scrollFromBottom: boolean | null): Message[] => {
	const searchKey = searchValue.split(":", 1)[0].toLowerCase();
	const searchString = searchValue.slice(searchKey.length + 1);
	if (searchKey in searchPrefixes && searchString) {
		chatLogs = searchPrefixes[searchKey as SearchPrefixKey](searchString, chatLogs);
	} else if (searchValue) {
		chatLogs = textSearch(searchValue, chatLogs, scrollFromBottom === null);
	}

	return scrollFromBottom === false ? [...chatLogs].reverse() : chatLogs;
};
