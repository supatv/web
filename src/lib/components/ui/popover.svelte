<script lang="ts">
	import type { Snippet } from "svelte";
	import { Popover as PopoverPrimitive } from "bits-ui";

	import { cn } from "$lib/utils";

	type Props = {
		open?: boolean;
		class?: string;
		align?: PopoverPrimitive.ContentProps["align"];
		sideOffset?: number;
		trigger: Snippet<[{ props: Record<string, unknown> }]>;
		children?: Snippet;
	};

	let { open = $bindable(false), class: className, align = "start", sideOffset = 6, trigger, children }: Props = $props();
</script>

<PopoverPrimitive.Root bind:open>
	<PopoverPrimitive.Trigger>
		{#snippet child({ props })}
			{@render trigger({ props })}
		{/snippet}
	</PopoverPrimitive.Trigger>

	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Content
			{align}
			{sideOffset}
			class={cn(
				"border-line bg-surface z-50 rounded-lg border shadow-xl duration-150",
				"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
				className
			)}
		>
			{@render children?.()}
		</PopoverPrimitive.Content>
	</PopoverPrimitive.Portal>
</PopoverPrimitive.Root>
