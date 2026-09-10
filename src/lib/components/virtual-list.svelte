<script lang="ts">
	import type { Snippet } from "svelte";
	import { untrack } from "svelte";

	import { cn } from "$lib/utils";

	type ScrollDetail = {
		offset: number;
		distanceFromBottom: number;
	};

	type Seek = {
		index: number;
		align: "start" | "center";
	};

	type Props = {
		itemCount: number;
		itemSize: number;
		dynamic?: boolean;
		overscan?: number;
		text?: (index: number) => string;
		class?: string;
		contentClass?: string;
		onscroll?: (detail: ScrollDetail) => void;
		item: Snippet<[number, string]>;
	};

	let { itemCount, itemSize, dynamic = false, overscan = 4, text, class: className, contentClass, onscroll, item }: Props = $props();

	let viewport: HTMLDivElement;
	let canvas: HTMLDivElement;
	let shadow: HTMLDivElement | undefined = $state();
	let viewportHeight = $state(0);
	let offset = $state(0);
	let pinned = false;
	let anchor = 0;
	let seek: Seek | null = null;
	let placed = -1;
	let total = 0;

	// a correction the list owes the scroll position. Assigning scrollTop cancels an in-flight fling
	// on iOS, and the reader scrolling up through rows that have never been measured earns one of
	// these every frame, so the rows are moved by that much instead and the scroller is only squared
	// up once the scroll settles. `offset` stays in canvas space, ahead of scrollTop by what is held.
	let held = 0;
	let settling: ReturnType<typeof setTimeout> | undefined;

	// under `dynamic` itemSize is only the height a row starts out guessed at. Measured heights and
	// their running offsets are plain arrays, so a row settling rewrites them without every row
	// depending on every height: `measurement` is the one signal that they moved, `valid` how far
	// the offsets survived it.
	let measurement = $state(0);
	const heights: number[] = [];
	const offsets: number[] = [0];
	let valid = 0;
	let guess = 0;

	const rowHeight = (index: number) => heights[index] || itemSize;

	const layout = $derived.by(() => {
		if (guess !== itemSize) {
			guess = itemSize;
			valid = 0;
		}
		if (valid > itemCount) valid = itemCount;
		for (let i = valid; i < itemCount; i++) offsets[i + 1] = offsets[i] + (heights[i] || itemSize);
		offsets.length = itemCount + 1;
		valid = itemCount;
		return { measurement, offsets, total: offsets[itemCount] };
	});

	const rowAt = (y: number) => {
		let lo = 0;
		let hi = itemCount;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (layout.offsets[mid + 1] <= y) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	};

	const rowTop = (index: number) => (dynamic ? layout.offsets[index] : index * itemSize);

	const firstVisible = $derived(dynamic ? rowAt(offset) : Math.floor(offset / itemSize));
	const start = $derived(Math.max(0, firstVisible - overscan));
	const end = $derived(Math.min(itemCount, (dynamic ? rowAt(offset + viewportHeight) + 1 : Math.ceil((offset + viewportHeight) / itemSize)) + overscan));
	const indexes = $derived(Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i));

	// find-in-page only sees what is in the document, so a row the list is not rendering leaves its
	// text behind in one of these, clipped to a point at the row's place in the scroll. `until-found`
	// is what makes that free: the browser skips the subtree until a search reaches it, and the
	// scroll it does to reveal the match is what brings the real row in. A row that is on screen
	// would be a second match for what the reader can already see, so the window's worth of them is
	// switched off as it moves — plain `hidden` takes an element out of find-in-page.
	const shadowStyle = (index: number) => `position: absolute; top: ${rowTop(index)}px; width: 1px; height: 1px; overflow: hidden; white-space: nowrap; color: transparent;`;

	let mutedFrom = 0;
	let mutedTo = 0;

	const mute = (index: number, matchable: boolean) => shadow?.children[index]?.setAttribute("hidden", matchable ? "until-found" : "");

	$effect(() => {
		const from = start;
		const to = end;
		if (!shadow) return;
		untrack(() => {
			for (let i = mutedFrom; i < mutedTo; i++) if (i < from || i >= to) mute(i, true);
			for (let i = from; i < to; i++) mute(i, false);
			mutedFrom = from;
			mutedTo = to;
		});
	});

	// the held correction rides on the canvas rather than the scroller, so the tail it lifts the rows
	// off the bottom by is added back as canvas height and the scrollable range never moves
	const paint = () => {
		canvas.style.height = `${total + held}px`;
		canvas.style.transform = held ? `translateY(${-held}px)` : "";
	};

	const clamp = (top: number) => Math.min(Math.max(top, 0), Math.max(0, viewport.scrollHeight - viewport.clientHeight));

	const atBottom = () => viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop < 2;

	const place = (top: number) => {
		if (held) {
			held = 0;
			paint();
		}
		const target = clamp(top);
		// an overscrolling scroller reports a scrollTop outside the range it will settle back into;
		// writing that range to it snaps the rubberband out from under the reader's finger
		if (Math.abs(clamp(viewport.scrollTop) - target) > 0.5) viewport.scrollTop = target;
		placed = viewport.scrollTop;
		offset = placed;
		pinned = atBottom();
	};

	const settle = () => {
		clearTimeout(settling);
		settling = setTimeout(() => {
			if (held && viewport) place(offset);
		}, 150);
	};

	const shift = (delta: number) => {
		held += delta;
		paint();
		offset = viewport.scrollTop + held;
		settle();
	};

	export const scrollTo = (top: number) => {
		if (!viewport) return;
		seek = null;
		place(top);
	};

	export const scrollToBottom = () => scrollTo(viewport?.scrollHeight ?? 0);

	const seekTop = ({ index, align }: Seek) => rowTop(index) - (align === "center" ? viewportHeight / 2 - rowHeight(index) / 2 : 0);

	// a row only has an estimated offset until it has been rendered and measured, so hold the index
	// in view while the rows around it settle rather than the pixel it first landed on
	export const scrollToIndex = (index: number, align: "start" | "center" = "start") => {
		if (!viewport) return;
		const target: Seek = { index, align };
		seek = dynamic ? target : null;
		place(seekTop(target));
	};

	const handleScroll = () => {
		const top = viewport.scrollTop;
		// a scroll event landing exactly where the list last put the scroller is the echo of that
		// write, not the reader: an unmeasured row rendering taller than its slot grows the scrollable
		// area under a viewport already sitting at the bottom, and taking that for a scroll away from
		// the bottom is what unpins a list that is following new rows
		if (top !== placed) {
			seek = null;
			pinned = atBottom();
			if (held) settle();
		}
		offset = top + held;
		onscroll?.({ offset, distanceFromBottom: pinned ? 0 : Math.max(0, viewport.scrollHeight - viewport.clientHeight - top) });
	};

	// not a SvelteMap: nothing renders off this, and it is rewritten for every row on every scroll tick
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const observed = new Map<Element, number>();
	let observer: ResizeObserver | undefined = $state();

	const record = (sizes: [number, number][]) => {
		let changed = -1;

		for (const [index, height] of sizes) {
			if (!height || heights[index] === height) continue;
			// a row above the fold growing slides what the reader is looking at down with it
			if (index < firstVisible) anchor += height - rowHeight(index);
			heights[index] = height;
			if (changed === -1 || index < changed) changed = index;
		}

		if (changed === -1) return;
		if (changed < valid) valid = changed;
		measurement++;
	};

	$effect(() => {
		if (!dynamic) return;

		const resize = new ResizeObserver((entries) => {
			const sizes: [number, number][] = [];
			for (const entry of entries) {
				const index = observed.get(entry.target);
				if (index !== undefined) sizes.push([index, entry.borderBoxSize[0]?.blockSize ?? entry.target.getBoundingClientRect().height]);
			}
			untrack(() => record(sizes));
		});

		observer = resize;

		return () => {
			clearTimeout(settling);
			resize.disconnect();
			observed.clear();
			observer = undefined;
		};
	});

	// rows are keyed by absolute index, so an element belongs to one row for as long as it is in the
	// window and the observer reports its height from the moment it is handed over. Reading the rows
	// back here instead would put a forced layout per row on every scroll tick.
	$effect(() => {
		const visible = indexes;
		const resize = observer;
		if (!dynamic || !resize || !canvas) return;

		untrack(() => {
			for (const [i, index] of visible.entries()) {
				const element = canvas.children[i];
				if (!element) break;
				if (!observed.has(element)) resize.observe(element, { box: "border-box" });
				observed.set(element, index);
			}

			// a row that scrolled out of the window took its element out of the document with it
			for (const element of observed.keys()) {
				if (element.isConnected) continue;
				resize.unobserve(element);
				observed.delete(element);
			}
		});
	});

	// the canvas height is written here rather than bound in the template so that it lands before
	// the scroll is corrected for it: the browser clamps a scrollTop past the end of the old height,
	// and a row settling into its real height is exactly what pushes that end away
	$effect(() => {
		const height = dynamic ? layout.total : itemCount * itemSize;
		if (!canvas) return;
		total = height;
		paint();

		if (!dynamic || !viewport) return;
		untrack(() => {
			if (seek) place(seekTop(seek));
			else if (pinned) place(height);
			else if (anchor) shift(anchor);
			anchor = 0;
		});
	});
</script>

<!-- a viewport of absolutely positioned rows repaints whole every frame unless the scroller gets its own layer -->
<div bind:this={viewport} bind:clientHeight={viewportHeight} onscroll={handleScroll} class={cn("h-full overflow-auto will-change-transform", className)}>
	<!-- outside the canvas, whose children the measurement below counts on being the rendered rows -->
	{#if text}
		<div bind:this={shadow} class="relative h-0">
			{#each { length: itemCount }, index}
				<div hidden="until-found" aria-hidden="true" style={shadowStyle(index)}>{text(index)}</div>
			{/each}
		</div>
	{/if}
	<!-- the rows are placed in here, so narrowing this narrows them without narrowing what scrolls -->
	<div bind:this={canvas} class={cn("relative w-full", contentClass)}>
		<!--
			Keyed by absolute index: rows here are expensive to build, so scrolling should move
			the existing ones and add one at the edge rather than rewrite every row in place.
		-->
		{#each indexes as index (index)}
			{@render item(index, `position: absolute; top: ${rowTop(index)}px;${dynamic ? "" : ` height: ${itemSize}px;`}`)}
		{/each}
	</div>
</div>
