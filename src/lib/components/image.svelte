<script lang="ts">
    let props = $props();

    let ref: HTMLImageElement;
    const onComplete = (event: Event) => {
        ref.classList.remove("animate-pulse");
        if (event.type !== "error") ref.classList.remove("bg-muted");
    };
</script>

<img bind:this={ref} onload={onComplete} onerror={onComplete} {...props} class="text-center bg-muted animate-pulse {props?.class}" />
