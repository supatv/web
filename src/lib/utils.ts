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
		return scrollFromBottom === false ? [...chatLogs].reverse() : chatLogs;
	}

	if (searchValue.startsWith(searchPrefixes.regexPrefix)) {
		try {
			const regex = new RegExp(searchValue.slice(searchPrefixes.regexPrefix.length), "i");
			const logs = chatLogs.filter((msg) => regex.test(msg.text));
			return scrollFromBottom === false ? [...logs].reverse() : logs;
		} catch {
			return [];
		}
	}

	const searchOptions = scrollFromBottom === null ? { keys: ["channel", "displayName", "text"], threshold: 0.5 } : { keys: ["text"], threshold: 0.5, limit: 5000 };

	const logs = fuzzysort
		.go(searchValue, chatLogs, searchOptions)
		.map((x) => x.obj)
		.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

	return scrollFromBottom === false ? [...logs].reverse() : logs;
}
