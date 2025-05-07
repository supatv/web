import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import fuzzysort from "fuzzysort";
import type { Message } from "$lib/types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const searchPrefixes = {
	regex: "regex:",
};

export function messageSearch(searchValue: string, chatLogs: Message[], scrollFromBottom: boolean | null): Message[] {
	if (searchValue.startsWith(searchPrefixes.regex)) {
		try {
			const regex = new RegExp(searchValue.slice(searchPrefixes.regex.length), "i");

			chatLogs = chatLogs.filter((msg) => regex.test(msg.text));
		} catch {
			return [];
		}
	} else if (searchValue) {
		const searchOptions = scrollFromBottom === null ? { keys: ["channel", "displayName", "text"], threshold: 0.5 } : { keys: ["text"], threshold: 0.5, limit: 5000 };

		chatLogs = fuzzysort
			.go(searchValue, chatLogs, searchOptions)
			.map((x) => x.obj)
			.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
	}

	return !scrollFromBottom ? [...chatLogs].reverse() : chatLogs;
}
