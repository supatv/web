import { writable } from "svelte/store";

export const playerVol = writable<number>(0);
export const playerMuted = writable<boolean>(true);
export const gridCols = writable<null | number>(null);
