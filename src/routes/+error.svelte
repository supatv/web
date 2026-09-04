<script lang="ts">
	import { getContext } from "svelte";
	import { ArrowLeftIcon, TvIcon } from "@lucide/svelte";

	import { page } from "$app/state";

	import { type TitleContext } from "$lib/common";
	import { Button } from "$lib/components/ui";

	getContext<TitleContext>("title").set(`Error ${page.status}`);

	const headings: Record<number, string> = {
		400: "That request came out garbled",
		403: "This channel is scrambled",
		404: "Nothing on this channel",
		429: "Too many channel flips",
		500: "The signal dropped",
		503: "Off air for a moment",
	};

	const heading = $derived(headings[page.status] ?? "The signal dropped");
	const detail = $derived(page.error?.message);
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
	<svg viewBox="0 0 24 24" fill="none" class="text-accent size-40 sm:size-48" role="img" aria-label="Status {page.status}">
		<clipPath id="error-screen">
			<rect x="2" y="6" width="20" height="16" rx="5.5" />
		</clipPath>

		<path d="M9.2 7 7 2.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		<circle cx="6.6" cy="2.3" r="1.4" fill="currentColor" />
		<path d="M14.8 7 16.5 4.3 18.2 4.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
		<circle cx="18.9" cy="4.8" r="1.4" fill="currentColor" />

		<rect x="2" y="6" width="20" height="16" rx="5.5" fill="currentColor" />

		<g clip-path="url(#error-screen)">
			<circle cx="5.6" cy="18.6" r="1.1" fill="var(--accent-ink)" opacity="0.28" />
			<circle cx="18.4" cy="18.6" r="1.1" fill="var(--accent-ink)" opacity="0.28" />
			<text x="12" y="15.4" text-anchor="middle" fill="var(--accent-ink)" class="font-display flicker" font-size="7.4" font-weight="700" style="font-variant-numeric: tabular-nums"
				>{page.status}</text
			>
			<rect x="7" y="18.1" width="10" height="1" rx="0.5" fill="var(--accent-ink)" opacity="0.28" />
			<rect x="9.2" y="19.9" width="5.6" height="1" rx="0.5" fill="var(--accent-ink)" opacity="0.28" />
			<rect class="roll" x="2" y="13.6" width="20" height="1.6" fill="var(--accent-ink)" opacity="0.12" />
		</g>
	</svg>

	<div class="space-y-2">
		<h1 class="font-display text-3xl font-semibold">{heading}</h1>
		{#if detail}
			<p class="text-dim text-base">{detail}</p>
		{/if}
	</div>

	<div class="flex flex-wrap items-center justify-center gap-2">
		<Button variant="outline" onclick={() => history.back()}>
			<ArrowLeftIcon />
			Go back
		</Button>
		<Button variant="accent" href="/live">
			<TvIcon />
			Livestreams
		</Button>
	</div>
</div>

<style>
	.roll {
		animation: roll 5s linear infinite;
	}

	.flicker {
		animation: flicker 5s steps(1, end) infinite;
	}

	@keyframes roll {
		from {
			transform: translateY(-8px);
		}
		to {
			transform: translateY(8px);
		}
	}

	@keyframes flicker {
		0%,
		52%,
		56%,
		92%,
		96% {
			opacity: 1;
		}
		54%,
		94% {
			opacity: 0.45;
		}
	}
</style>
