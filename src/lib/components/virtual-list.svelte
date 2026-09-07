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
		class?: string;
		contentClass?: string;
		onscroll?: (detail: ScrollDetail) => void;
		item: Snippet<[number, string]>;
	};

	let { itemCount, itemSize, dynamic = false, overscan = 4, class: className, contentClass, onscroll, item }: Props = $props();

	let viewport: HTMLDivElement;
	let canvas: HTMLDivElement;
	let viewportHeight = $state(0);
	let offset = $state(0);
	let pinned = false;
	let anchor = 0;
	let seek: Seek | null = null;
	let placed = -1;

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

	const atBottom = () => viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop < 2;

	const place = (top: number) => {
		viewport.scrollTop = top;
		placed = viewport.scrollTop;
		offset = viewport.scrollTop;
		pinned = atBottom();
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
		if (viewport.scrollTop !== placed) seek = null;
		offset = viewport.scrollTop;
		pinned = atBottom();
		onscroll?.({ offset, distanceFromBottom: viewport.scrollHeight - viewport.clientHeight - offset });
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
			resize.disconnect();
			observed.clear();
			observer = undefined;
		};
	});

	// rows are recycled across indexes, so one that keeps its height as it takes a new index reports
	// nothing to the observer and has to be read here; the observer covers what happens to it after
	$effect(() => {
		const visible = indexes;
		const resize = observer;
		if (!dynamic || !resize || !canvas) return;

		untrack(() => {
			const sizes: [number, number][] = [];

			for (const [i, index] of visible.entries()) {
				const element = canvas.children[i];
				if (!element) break;
				if (!observed.has(element)) resize.observe(element, { box: "border-box" });
				observed.set(element, index);
				sizes.push([index, element.getBoundingClientRect().height]);
			}

			// a row that scrolled out of the window took its element out of the document with it
			for (const element of observed.keys()) {
				if (element.isConnected) continue;
				resize.unobserve(element);
				observed.delete(element);
			}

			record(sizes);
		});
	});

	// the canvas height is written here rather than bound in the template so that it lands before
	// the scroll is corrected for it: the browser clamps a scrollTop past the end of the old height,
	// and a row settling into its real height is exactly what pushes that end away
	$effect(() => {
		const height = dynamic ? layout.total : itemCount * itemSize;
		if (!canvas) return;
		canvas.style.height = `${height}px`;

		if (!dynamic || !viewport) return;
		untrack(() => {
			if (seek) place(seekTop(seek));
			else if (pinned) place(height);
			else if (anchor) place(viewport.scrollTop + anchor);
			anchor = 0;
		});
	});
</script>

<!-- a viewport of absolutely positioned rows repaints whole every frame unless the scroller gets its own layer -->
<div bind:this={viewport} bind:clientHeight={viewportHeight} onscroll={handleScroll} class={cn("h-full overflow-auto will-change-transform", className)}>
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
