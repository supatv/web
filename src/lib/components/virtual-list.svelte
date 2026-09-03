<script lang="ts">
	import type { Snippet } from "svelte";

	import { cn } from "$lib/utils";

	type ScrollDetail = {
		offset: number;
		distanceFromBottom: number;
	};

	type Props = {
		itemCount: number;
		itemSize: number;
		overscan?: number;
		class?: string;
		onscroll?: (detail: ScrollDetail) => void;
		item: Snippet<[number, string]>;
	};

	let { itemCount, itemSize, overscan = 4, class: className, onscroll, item }: Props = $props();

	let viewport: HTMLDivElement;
	let viewportHeight = $state(0);
	let offset = $state(0);

	const start = $derived(Math.max(0, Math.floor(offset / itemSize) - overscan));
	const end = $derived(Math.min(itemCount, Math.ceil((offset + viewportHeight) / itemSize) + overscan));
	const indexes = $derived(Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i));

	export const scrollTo = (top: number) => {
		if (viewport) viewport.scrollTop = top;
	};

	export const scrollToBottom = () => scrollTo(viewport?.scrollHeight ?? 0);

	export const scrollToIndex = (index: number, align: "start" | "center" = "start") => {
		scrollTo(index * itemSize - (align === "center" ? viewportHeight / 2 - itemSize / 2 : 0));
	};

	const handleScroll = () => {
		offset = viewport.scrollTop;
		onscroll?.({ offset, distanceFromBottom: viewport.scrollHeight - viewport.clientHeight - offset });
	};
</script>

<div bind:this={viewport} bind:clientHeight={viewportHeight} onscroll={handleScroll} class={cn("h-full overflow-auto", className)}>
	<div class="relative w-full" style="height: {itemCount * itemSize}px;">
		<!--
			Keyed by absolute index: rows here are expensive to build, so scrolling should move
			the existing ones and add one at the edge rather than rewrite every row in place.
		-->
		{#each indexes as index (index)}
			{@render item(index, `position: absolute; top: ${index * itemSize}px; height: ${itemSize}px;`)}
		{/each}
	</div>
</div>
