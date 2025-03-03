type Social = {
    url: string;
    name: string;
    title: string;
}

enum ContractType {
    affiliate = 'AFFILIATE',
    partner = 'PARTNER'
}

enum StreamState {
    recording = 'RECORDING',
    processing = 'PROCESSING',
    archived = 'ARCHIVED',
    deleted = 'DELETED'
}

type User = {
    id: number;
    twitch_id: string;
    login: string;
    display_name: string;
    avatar_url: string;
    followers: number;
    contract_type: ContractType | null;
    is_staff: boolean | null;
    created_at?: string;
    updated_at?: string;
    description?: string;
    banner_url?: string;
    offline_image_url?: string
    unlisted?: boolean;
    socials?: Social[];
};

type Stream = {
    id: number;
    twitch_video_id: string | null;
    created_at: string;
    ended_at: string | null;
    duration_ms: number | null;
    game_name: string;
    title: string;
    is_mature: boolean;
    state: StreamState;
}

export type { User, Stream }