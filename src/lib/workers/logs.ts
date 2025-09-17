/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/// <reference types="@sveltejs/kit" />

import { op } from "$lib/workers/common/logs";
import fuzzysort from "fuzzysort";

const self = globalThis.self as unknown as Worker;

let channelTargets: Fuzzysort.Prepared[] = [];

const handlers = {
	[op.READY]: async () => {
		const res = await fetch("https://logs.zonian.dev/channels");
		if (!res.ok) {
			throw res;
		}

		const data = await res.json();
		const channels: { name: string; userID: string }[] = data.channels;
		channelTargets = channels.map(({ name }) => fuzzysort.prepare(name));

		self.postMessage({
			op: op.CLIENT_DATA,
			payload: { channelsCount: channels.length },
		});
	},
	[op.SEARCH]: (query: string) => {
		self.postMessage({
			op: op.CLIENT_SEARCH_RESULTS,
			payload: fuzzysort.go(query, channelTargets, { threshold: 0.5, limit: 5 }),
		});
	},
};

self.onmessage = (event) => {
	handlers[event.data.op]?.(event.data.payload);
};

