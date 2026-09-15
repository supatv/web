<script lang="ts">
	import type { SVGAttributes } from "svelte/elements";

	let { class: className, ...rest }: SVGAttributes<SVGSVGElement> = $props();

	let playing = $state(false);

	export function play() {
		playing = true;
	}
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	class={[className, playing && "playing"]}
	aria-hidden="true"
	{...rest}
	onanimationend={(e) => {
		// the ears and eyes bubble their own animationend up to here
		if (e.target === e.currentTarget) playing = false;
	}}
>
	<g class="ear-l">
		<path d="M9.2 7 7 2.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		<circle cx="6.6" cy="2.3" r="1.4" fill="currentColor" />
	</g>
	<g class="ear-r">
		<path d="M14.8 7 17 2.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		<circle cx="17.4" cy="2.3" r="1.4" fill="currentColor" />
	</g>
	<rect x="2" y="6" width="20" height="16" rx="5.5" fill="currentColor" />
	<circle cx="6" cy="16.2" r="1.1" fill="var(--accent-ink)" opacity="0.28" />
	<circle cx="18" cy="16.2" r="1.1" fill="var(--accent-ink)" opacity="0.28" />
	<g class="eyes">
		<circle cx="8.8" cy="12.6" r="1.5" fill="var(--accent-ink)" />
		<circle cx="15.2" cy="12.6" r="1.5" fill="var(--accent-ink)" />
	</g>
	<path d="M9 16.4q3 2.8 6 0" fill="none" stroke="var(--accent-ink)" stroke-width="2" stroke-linecap="round" />
</svg>

<style>
	svg {
		overflow: visible;
		transform-origin: 50% 100%;
	}

	.ear-l,
	.ear-r {
		transform-box: view-box;
	}

	.ear-l {
		transform-origin: 9.2px 7px;
	}

	.ear-r {
		transform-origin: 14.8px 7px;
	}

	.eyes {
		transform-box: fill-box;
		transform-origin: center;
	}

	.playing {
		animation: hop 700ms ease-out;
	}

	.playing .ear-l {
		animation: wiggle 700ms ease-out;
	}

	.playing .ear-r {
		animation: wiggle 700ms ease-out reverse;
	}

	.playing .eyes {
		animation: blink 700ms ease-in-out;
	}

	@keyframes hop {
		0%,
		100% {
			transform: none;
		}
		18% {
			transform: scale(1.08, 0.88);
		}
		45% {
			transform: translateY(-18%) scale(0.96, 1.06);
		}
		72% {
			transform: scale(1.05, 0.93);
		}
	}

	@keyframes wiggle {
		0%,
		100% {
			transform: none;
		}
		25% {
			transform: rotate(-20deg);
		}
		50% {
			transform: rotate(14deg);
		}
		75% {
			transform: rotate(-6deg);
		}
	}

	@keyframes blink {
		0%,
		35%,
		55%,
		100% {
			transform: none;
		}
		45% {
			transform: scaleY(0.1);
		}
	}
</style>
