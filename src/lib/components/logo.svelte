<script lang="ts">
	import type { SVGAttributes } from "svelte/elements";

	let { class: className, ...rest }: SVGAttributes<SVGSVGElement> = $props();

	let animation: "hop" | "flip" | undefined = $state();
	let clicks = 0;
	let lastClick = 0;

	export function play() {
		const now = performance.now();
		clicks = now - lastClick < 500 ? clicks + 1 : 1;
		lastClick = now;
		if (clicks >= 3) {
			clicks = 0;
			animation = "flip";
		} else {
			animation ??= "hop";
		}
	}
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	class={[className, animation]}
	aria-hidden="true"
	{...rest}
	onanimationend={(e) => {
		// the inner groups bubble their own animationend up to here
		if (e.target === e.currentTarget) animation = undefined;
	}}
>
	<g class="spin">
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
	</g>
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

	.hop {
		animation: hop 700ms ease-out;
	}

	.spin {
		transform-box: view-box;
		transform-origin: 12px 13px;
	}

	.flip {
		animation:
			flip-jump 900ms linear,
			flip-squash 900ms linear;
	}

	.flip .spin {
		animation: flip-spin 900ms linear;
	}

	.hop .ear-l {
		animation: wiggle 700ms ease-out;
	}

	.hop .ear-r {
		animation: wiggle 700ms ease-out reverse;
	}

	.hop .eyes {
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

	@keyframes flip-jump {
		0%,
		16% {
			translate: 0 0;
			animation-timing-function: cubic-bezier(0.25, 0.75, 0.5, 1);
		}
		50% {
			translate: 0 -30%;
			animation-timing-function: cubic-bezier(0.5, 0, 0.75, 0.25);
		}
		84%,
		100% {
			translate: 0 0;
		}
	}

	@keyframes flip-squash {
		0% {
			scale: 1;
			animation-timing-function: ease-out;
		}
		14% {
			scale: 1.14 0.8;
			animation-timing-function: ease-in;
		}
		24% {
			scale: 0.9 1.12;
			animation-timing-function: ease-in-out;
		}
		42%,
		80% {
			scale: 1;
			animation-timing-function: ease-in;
		}
		88% {
			scale: 1.16 0.82;
			animation-timing-function: ease-out;
		}
		95% {
			scale: 0.97 1.04;
			animation-timing-function: ease-in-out;
		}
		100% {
			scale: 1;
		}
	}

	@keyframes flip-spin {
		0%,
		18% {
			rotate: 0deg;
			animation-timing-function: cubic-bezier(0.35, 0.1, 0.65, 0.9);
		}
		82%,
		100% {
			rotate: 360deg;
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
