import { writable } from "svelte/store";

export const muted = writable(true);
export const gridCols = writable<null | number>(null);
