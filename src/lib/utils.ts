import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import fuzzysort from "fuzzysort";
import type { Message } from "$lib/types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function messageSearch(searchValue: string, chatLogs: Message[], scrollFromBottom: boolean | null): Message[] {
	const searchPrefixes = {
		regexPrefix: "regex:",
	};

	if (!searchValue) {
		return chatLogs;
	}

	if (searchValue.startsWith(searchPrefixes.regexPrefix)) {
		try {
			const regex = new RegExp(searchValue.slice(searchPrefixes.regexPrefix.length), "i");
			return chatLogs.filter((msg) => regex.test(msg.text));
		} catch {
			return [];
		}
	}

	// Scroll From Bottom is only usable on logs. We pass in null here to indicate that we are searching firehose messages.
	if (scrollFromBottom === null) {
		return fuzzysort
				.go(searchValue, chatLogs, { keys: ["channel", "displayName", "text"], threshold: 0.5 })
				.map((x) => x.obj)
				.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
	}

	const logs = fuzzysort
					.go(searchValue, chatLogs, { key: "text", threshold: 0.5, limit: 5000 })
					.map((x) => x.obj)
					.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));


	return scrollFromBottom ? logs : logs.reverse();
}
