<script lang="ts">
	import { Slider as SliderPrimitive } from "bits-ui";

	import { cn } from "$lib/utils";

	type Props = { class?: string } & SliderPrimitive.RootProps;

	let { class: className, value = $bindable(), ...rest }: Props = $props();
</script>

<SliderPrimitive.Root bind:value={value as never} class={cn("relative flex h-4 w-full touch-none items-center select-none", className)} {...rest}>
	{#snippet children({ thumbItems })}
		<span class="bg-line relative h-1 w-full grow overflow-hidden rounded-full">
			<SliderPrimitive.Range class="bg-accent absolute h-full" />
		</span>
		{#each thumbItems as { index } (index)}
			<SliderPrimitive.Thumb {index} class="ring-focus bg-accent block size-3 rounded-full transition-transform hover:scale-125" />
		{/each}
	{/snippet}
</SliderPrimitive.Root>
