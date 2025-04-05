<script>
	// import Image from "../image.svelte";

	import * as Tooltip from "$lib/components/ui/tooltip";
	let { src, preview, name, provider, mode } = $props();
</script>

<!-- <Image {src} alt={name} title={name} class="inline-block max-h-5" /> -->

<Tooltip.Provider>
	<Tooltip.Root delayDuration={200} disableHoverableContent={true}>
		<Tooltip.Trigger class="align-middle">
			<img {src} alt={name} class="max-h-5" />
		</Tooltip.Trigger>
		<Tooltip.Content class="flex flex-col items-center p-2">
			<img src={preview} alt={name} class="max-h-28" />
			<p class="text-base">{name}</p>
			<span class="text-xs opacity-60">{mode ? `${mode} ` : ""}{provider} Emote</span>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
