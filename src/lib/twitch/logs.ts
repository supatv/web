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
