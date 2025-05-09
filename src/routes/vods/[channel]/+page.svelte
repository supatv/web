<script lang="ts">
	import { getContext, onDestroy, onMount } from "svelte";
	import { page } from "$app/state";

	import Image from "$lib/components/image.svelte";

	import { Skeleton } from "$lib/components/ui/skeleton/index.js";
	import { EyeOffIcon } from "@lucide/svelte";

	import type { PageProps } from "./$types";
	import type { Stream } from "$lib/twitch/streams";
	import { dateFormat, dateTimeFormat, type TitleContext } from "$lib/common";

	import dayjs from "dayjs";
	import relativeTime from "dayjs/plugin/relativeTime";
	import duration from "dayjs/plugin/duration";

	const title = getContext<TitleContext>("title");

	dayjs.extend(relativeTime);
	dayjs.extend(duration);

	const formatDuration = (time: number, unit?: duration.DurationUnitType) => {
		const d = dayjs.duration(time, unit);

		const hours = Math.floor(d.asHours());
		const minutes = d.minutes().toString();
		const secs = d.seconds().toString().padStart(2, "0");

		return hours > 0 ? `${hours}:${minutes.padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
	};

	let { data }: PageProps = $props();
	let { user } = data;

	title.set(`${user.display_name}: VODs`);

	let streams: Stream[] | null = $state(null);

	const fetchStreams = async (userId: number) => {
		const res = await fetch(`https://api-tv.supa.sh/streams?user_id=${encodeURIComponent(userId)}`);
		streams = await res.json();
	};

	let liveTicker = $state(0);
	let secInterval: number | NodeJS.Timeout | null = null;

	onMount(() => {
		fetchStreams(user.id);

		secInterval = setInterval(() => {
			liveTicker++;
		}, 1000);
	});

	onDestroy(() => {
		if (secInterval) {
			clearTimeout(secInterval);
			secInterval = null;
		}
	});
</script>

<svelte:head>
	<title>{user.display_name} - VODs</title>
	<meta property="og:title" content="{user.display_name} - VODs" />
	<meta property="og:description" content={user.description} />
	<meta property="og:image" content={user.avatar_url} />
</svelte:head>

<div class="flex flex-col p-5">
	<div class="flex w-fit flex-wrap items-center justify-center gap-3">
		<Image src={user.avatar_url} alt="Avatar" class="size-28 rounded-full drop-shadow-md" />
		<div class="flex flex-col">
			<span class="break-all text-3xl drop-shadow lg:text-5xl">{user.display_name}</span>
			{#if user.unlisted}
				<div class="mx-1">
					<span class="flex items-center whitespace-pre text-sm text-gray-500">
						<EyeOffIcon class="inline size-4" /> Unlisted
					</span>
				</div>
			{/if}
		</div>
	</div>

	<hr class="my-5" />
	<div class="grid w-full max-w-[2500px] grid-cols-1 gap-5 self-center sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
		{#if streams === null}
			{#each { length: 20 }}
				<div class="size-full">
					<Skeleton class="aspect-video w-full rounded-sm" />
					<div class="mt-1 h-5">
						<Skeleton class="h-4 w-full" />
					</div>
				</div>
			{/each}
		{:else}
			{#each streams as stream (stream.id)}
				{@const createdAt = new Date(stream.created_at)}
				{@const duration = stream.duration_ms}
				<a href="/vods/{page.params.channel}/{stream.id.toString()}">
					<div class="relative overflow-hidden rounded-sm">
						<span class="absolute left-0 m-1 rounded-sm px-0.5 text-xs text-white {duration === null ? 'bg-red-600' : 'bg-black/60'}" title={dayjs(createdAt).format(dateTimeFormat)}>
							{duration === null ? "Live" : dayjs().diff(stream.created_at, "year") >= 1 ? dayjs(stream.created_at).format(dateFormat) : dayjs(stream.created_at).fromNow()}
						</span>
						{#if stream.state === "RECORDING"}
							<span class="absolute bottom-0 left-0 m-1 rounded-sm bg-black/60 px-0.5 text-xs text-white">Recording...</span>
						{/if}
						<span class="absolute bottom-0 right-0 m-1 rounded-sm bg-black/60 px-0.5 text-xs tabular-nums text-white">
							{#if duration === null}
								{#key liveTicker}
									{formatDuration(Date.now() - createdAt.getTime(), "ms")}
								{/key}
							{:else}
								{formatDuration(duration, "ms")}
							{/if}
						</span>
						<Image src="https://r2-vods.supa.sh/{stream.id}/thumbnail.jpg" loading="lazy" alt="Thumbnail" class="aspect-video w-full" />
					</div>
					<p class="text-gray line-clamp-2" title={stream.title}>{stream.title}</p>
				</a>
			{/each}
		{/if}
	</div>
</div>
