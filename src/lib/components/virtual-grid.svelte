<script lang="ts">
	import type { Snippet } from "svelte";
	import { untrack } from "svelte";

	import { cn } from "$lib/utils";

	type ScrollDetail = {
		offset: number;
		distanceFromBottom: number;
	};

	type Props = {
		itemCount: number;
		itemSize: number | ((width: number) => number);
		columns?: number;
		minItemWidth?: number;
		gap?: number;
		overscan?: number;
		windowScroll?: boolean;
		key?: (index: number) => PropertyKey;
		text?: (index: number) => string;
		class?: string;
		contentClass?: string;
		onscroll?: (detail: ScrollDetail) => void;
		item: Snippet<[number, string]>;
	};

	let { itemCount, itemSize, columns: fixedColumns, minItemWidth = 240, gap = 0, overscan = 2, windowScroll = false, key, text, class: className, contentClass, onscroll, item }: Props = $props();

	let viewport: HTMLDivElement | undefined;
	let canvas: HTMLDivElement | undefined;
	let shadow: HTMLDivElement | undefined = $state();
	// cells are placed against the canvas' padding box, so pad the viewport rather than the canvas
	let canvasWidth = $state(0);
	let containerHeight = $state(0);
	let windowHeight = $state(0);

	// canvas space: how far the top of the canvas has travelled above the top of the viewport. In
	// window mode it is negative for as long as the grid starts below the fold.
	let offset = $state(0);

	// the item the viewport opens on, kept in place across a column change
	let anchor = -1;
	let lastColumns = 0;

	// a lone cell keeps its column width instead of stretching, so the count is not capped at itemCount
	const columns = $derived(fixedColumns ?? Math.max(1, Math.floor((canvasWidth + gap) / (minItemWidth + gap))));
	const cellWidth = $derived((canvasWidth - gap * (columns - 1)) / columns);
	// a cell whose height follows its width — anything with an aspect ratio in it — cannot be told
	// what it measures until the columns are known
	const cellHeight = $derived(typeof itemSize === "function" ? itemSize(cellWidth) : itemSize);
	const pitch = $derived(cellHeight + gap);
	const rowCount = $derived(Math.ceil(itemCount / columns));
	const total = $derived(Math.max(0, rowCount * pitch - gap));
	const viewportHeight = $derived(windowScroll ? windowHeight : containerHeight);

	const startRow = $derived(Math.max(0, Math.floor(offset / pitch) - overscan));
	const endRow = $derived(Math.min(rowCount, Math.ceil((offset + viewportHeight) / pitch) + overscan));

	const indexes = $derived.by(() => {
		const visible: number[] = [];
		// a cell placed before the width is known would be laid out at zero width and reflowed a frame later
		if (!canvasWidth) return visible;
		for (let row = startRow; row < endRow; row++) {
			for (let col = 0; col < columns; col++) {
				const index = row * columns + col;
				if (index >= itemCount) break;
				visible.push(index);
			}
		}
		return visible;
	});

	const cellOffset = (index: number) => `top: ${Math.floor(index / columns) * pitch}px; left: ${(index % columns) * (cellWidth + gap)}px;`;

	const cellStyle = (index: number) => `position: absolute; ${cellOffset(index)} width: ${cellWidth}px; height: ${cellHeight}px;`;

	// clipped to a point and transparent: revealing a match neither shows the text nor lays it out
	const shadowStyle = (index: number) => `position: absolute; ${cellOffset(index)} width: 1px; height: 1px; overflow: hidden; white-space: nowrap; color: transparent;`;

	// a stand-in whose cell is on screen would be a second match for the card the reader can already
	// see, so the window's worth of them is switched off as it moves — plain `hidden` takes an
	// element out of find-in-page, and it goes back to matchable once the cell is gone again. Only
	// the window is touched, not every stand-in, and only when it moves off the row it was on.
	let mutedFrom = 0;
	let mutedTo = 0;

	const mute = (index: number, matchable: boolean) => shadow?.children[index]?.setAttribute("hidden", matchable ? "until-found" : "");

	$effect(() => {
		const from = indexes.length ? indexes[0] : 0;
		const to = indexes.length ? indexes[indexes.length - 1] + 1 : 0;
		if (!shadow) return;
		untrack(() => {
			for (let i = mutedFrom; i < mutedTo; i++) if (i < from || i >= to) mute(i, true);
			for (let i = from; i < to; i++) mute(i, false);
			mutedFrom = from;
			mutedTo = to;
		});
	});

	// in window mode the grid has no scroller of its own: it sits in the document flow and is
	// virtualized against the page scroll, so every position is taken relative to the canvas
	const origin = () => (windowScroll ? (canvas?.getBoundingClientRect().top ?? 0) + window.scrollY : 0);
	const scrollPos = () => (windowScroll ? window.scrollY : (viewport?.scrollTop ?? 0));
	const scrollRange = () => (windowScroll ? document.documentElement.scrollHeight - window.innerHeight : viewport ? viewport.scrollHeight - viewport.clientHeight : 0);

	const clamp = (top: number) => Math.min(Math.max(top, 0), Math.max(0, scrollRange()));

	const measure = () => (offset = scrollPos() - origin());

	const place = (top: number) => {
		const target = clamp(origin() + top);
		// an overscrolling scroller reports a scroll position outside the range it will settle back
		// into; writing that range to it snaps the rubberband out from under the reader's finger
		if (Math.abs(clamp(scrollPos()) - target) > 0.5) {
			if (windowScroll) window.scrollTo(0, target);
			else if (viewport) viewport.scrollTop = target;
		}
		measure();
	};

	export const scrollTo = (top: number) => {
		if (canvas) place(top);
	};

	export const scrollToBottom = () => scrollTo(total);

	export const scrollToIndex = (index: number, align: "start" | "center" = "start") => {
		if (canvas) place(Math.floor(index / columns) * pitch - (align === "center" ? viewportHeight / 2 - cellHeight / 2 : 0));
	};

	const handleScroll = () => {
		measure();
		// a reader who has not reached the grid yet has no cell to be held on
		anchor = offset > 0 ? Math.floor(offset / pitch) * columns : -1;
		onscroll?.({ offset, distanceFromBottom: Math.max(0, total - offset - viewportHeight) });
	};

	// the canvas moves as its own height and the layout above it change, so what the offset was last
	// measured against goes stale without a scroll to correct it
	$effect(() => {
		const cols = columns;
		const height = total;
		if (!canvas) return;
		untrack(() => {
			// a reflow moves an item to a different row, so the scroller is re-aimed at the item the
			// reader was on rather than the pixel it happened to sit at under the old column count
			if (lastColumns && cols !== lastColumns && anchor >= 0) place(Math.min(Math.floor(anchor / cols) * pitch, height));
			else measure();
			lastColumns = cols;
		});
	});
</script>

<svelte:window bind:innerHeight={windowHeight} onscroll={windowScroll ? handleScroll : undefined} onresize={windowScroll ? handleScroll : undefined} />

{#snippet cells()}
	<div bind:this={canvas} bind:clientWidth={canvasWidth} class={cn("relative w-full", contentClass)} style="height: {total}px">
		<!--
			find-in-page only sees what is in the document, so a cell the grid is not rendering leaves
			its text behind here, in the place the cell would have been. `until-found` is what makes
			that free: the browser skips the subtree until a search reaches it, and the scroll it does
			to reveal the match is what brings the real cell in.
		-->
		{#if text && canvasWidth}
			<div bind:this={shadow}>
				{#each { length: itemCount }, index}
					<div hidden="until-found" aria-hidden="true" style={shadowStyle(index)}>{text(index)}</div>
				{/each}
			</div>
		{/if}
		<!--
			Keyed by absolute index unless the caller names the cells: they are expensive to build, so
			scrolling should move the existing ones and add one at the edge rather than rewrite every
			cell in place, and a cell carrying state of its own wants to follow its item through a sort.
		-->
		{#each indexes as index (key ? key(index) : index)}
			{@render item(index, cellStyle(index))}
		{/each}
	</div>
{/snippet}

{#if windowScroll}
	<div class={cn("w-full", className)}>
		{@render cells()}
	</div>
{:else}
	<!-- a viewport of absolutely positioned cells repaints whole every frame unless the scroller gets its own layer -->
	<div bind:this={viewport} bind:clientHeight={containerHeight} onscroll={handleScroll} class={cn("h-full overflow-auto will-change-transform", className)}>
		{@render cells()}
	</div>
{/if}
