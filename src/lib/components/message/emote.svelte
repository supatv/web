<script>
    // import * as Tooltip from "$lib/components/ui/tooltip";
    let { src, name } = $props();
</script>

<img {src} alt={name} title={name} class="inline-block max-h-5" />

<!-- <Tooltip.Provider>
    <Tooltip.Root delayDuration={200} disableHoverableContent={true}>
        <Tooltip.Trigger class="align-middle">
            <img {src} alt={name} class="max-h-5" />
        </Tooltip.Trigger>
        <Tooltip.Content class="p-2 flex flex-col items-center" collisionBoundary={boundary}>
            <img {src} alt={name} class="max-h-28" />
            <p class="text-base">{name}</p>
            <span class="text-xs opacity-60">Twitch Emote</span>
        </Tooltip.Content>
    </Tooltip.Root>z
</Tooltip.Provider> -->
