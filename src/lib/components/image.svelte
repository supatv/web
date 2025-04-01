<script lang="ts">
    import { onMount } from "svelte";

    let props = $props();

    let ref: HTMLImageElement;

    const onComplete = (event: Event) => {
        ref.classList.remove("animate-pulse");
        if (event.type !== "error") ref.classList.remove("bg-muted");
    };

    onMount(() => {
        if (!ref.complete) ref.classList.add("bg-muted", "animate-pulse");
    });
</script>

<img bind:this={ref} onload={onComplete} onerror={onComplete} {...props} class="text-center {props?.class}" />
