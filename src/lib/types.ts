import { type Component } from "svelte";

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

export type TitleContext = {
	value: () => string;
	set: (newTitle: string) => void;
};
