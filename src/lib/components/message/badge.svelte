<script>
	import * as Tooltip from "$lib/components/ui/tooltip";
	let { src, preview, title = "", alt = "" } = $props();
</script>

<Tooltip.Provider>
	<Tooltip.Root delayDuration={200} disableHoverableContent={true}>
		<Tooltip.Trigger class="size-4">
			<img {src} {alt} class="max-h-4 min-w-4" />
		</Tooltip.Trigger>
		<Tooltip.Content class="flex flex-col items-center p-2">
			<img src={preview} alt={title} class="max-h-28" />
			<p class="text-base">{title}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
