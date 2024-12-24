<script lang="ts" generics="T">
    import { onMount, tick, type Snippet } from "svelte";

    const {
        items,
        height,
        itemHeight,
        children,
        getKey,
    }: {
        items: Array<T>;
        height: string;
        itemHeight?: number | undefined;
        children: Snippet<[T]>;
        getKey?: (item: T) => string | number;
    } = $props();

    // read-only, but visible to consumers via bind:start
    let start = $state(0);
    let end = $state(0);

    // local state
    let height_map: Array<number> = $state([]);
    let rows: HTMLCollectionOf<Element> = $state(null!);
    let viewport: HTMLElement = $state(null!);
    let contents: HTMLElement = $state(null!);
    let viewport_height = $state(0);
    let mounted: boolean = $state(false);

    let top = $state(0);
    let bottom = $state(0);
    let average_height: number = $state(null!);

    const visible: Array<{ id: number | string; data: T }> = $derived(
        items.slice(start, end).map((data, i) => {
            return { id: getKey?.(data) ?? i + start, data };
        }),
    );

    // whenever `items` changes, invalidate the current heightmap
    $effect(() => {
        if (mounted) {
            refresh(items, viewport_height, itemHeight);
        }
    });

    async function refresh(items: Array<any>, viewport_height: number, itemHeight?: number) {
        const { scrollTop } = viewport;

        await tick(); // wait until the DOM is up to date

        let content_height = top - scrollTop;
        let i = start;

        while (content_height < viewport_height && i < items.length) {
            let row = rows[i - start];

            if (!row) {
                end = i + 1;
                await tick(); // render the newly visible row
                row = rows[i - start];
            }

            const row_height = (height_map[i] = itemHeight || (row as HTMLElement).offsetHeight);
            content_height += row_height;
            i += 1;
        }

        end = i;

        const remaining = items.length - end;
        average_height = (top + content_height) / end;

        if (end === 0) {
            average_height = 0;
        }

        bottom = remaining * average_height;
        height_map.length = items.length;
        if (top >= bottom) {
            // scroll only if we are outside the viewbox
            viewport.scrollTo(0, 0);
        }
    }

    async function handle_scroll() {
        const { scrollTop } = viewport;

        const old_start = start;

        for (let v = 0; v < rows.length; v += 1) {
            height_map[start + v] = itemHeight || (rows[v] as HTMLElement).offsetHeight;
        }

        let i = 0;
        let y = 0;

        while (i < items.length) {
            const row_height = height_map[i] || average_height;
            if (y + row_height > scrollTop) {
                start = i;
                top = y;

                break;
            }

            y += row_height;
            i += 1;
        }

        while (i < items.length) {
            y += height_map[i] || average_height;
            i += 1;

            if (y > scrollTop + viewport_height) break;
        }

        end = i;

        const remaining = items.length - end;
        average_height = y / end;

        while (i < items.length) height_map[i++] = average_height;
        bottom = remaining * average_height;

        // prevent jumping if we scrolled up into unknown territory
        if (start < old_start) {
            await tick();

            let expected_height = 0;
            let actual_height = 0;

            for (let i = start; i < old_start; i += 1) {
                if (rows[i - start]) {
                    expected_height += height_map[i];
                    actual_height += itemHeight || (rows[i - start] as HTMLElement).offsetHeight;
                }
            }

            const d = actual_height - expected_height;
            viewport.scrollTo(0, scrollTop + d);
        }

        // TODO if we overestimated the space these
        // rows would occupy we may need to add some
        // more. maybe we can just call handle_scroll again?
    }

    // trigger initial refresh
    onMount(() => {
        rows = contents.getElementsByTagName("svelte-virtual-list-row");
        mounted = true;
    });
</script>

<svelte-virtual-list-viewport bind:this={viewport} bind:offsetHeight={viewport_height} onscroll={handle_scroll} style="height: {height};">
    <svelte-virtual-list-contents bind:this={contents} style="padding-top: {top}px; padding-bottom: {bottom}px;">
        {#each visible as row (row.id)}
            <svelte-virtual-list-row>
                {@render children?.(row.data)}
            </svelte-virtual-list-row>
        {/each}
    </svelte-virtual-list-contents>
</svelte-virtual-list-viewport>

<style>
    svelte-virtual-list-viewport {
        position: relative;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        display: block;
    }

    svelte-virtual-list-contents,
    svelte-virtual-list-row {
        display: block;
    }

    svelte-virtual-list-row {
        overflow: hidden;
    }
</style>
