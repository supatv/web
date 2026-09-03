<script lang="ts">
	import type { Snippet } from "svelte";
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { XIcon } from "@lucide/svelte";

	import { cn } from "$lib/utils";

	type Props = {
		open?: boolean;
		title: string;
		description?: string;
		class?: string;
		trigger?: Snippet<[{ props: Record<string, unknown> }]>;
		children?: Snippet;
		footer?: Snippet;
	};

	let { open = $bindable(false), title, description, class: className, trigger, children, footer }: Props = $props();
</script>

<DialogPrimitive.Root bind:open>
	{#if trigger}
		<DialogPrimitive.Trigger>
			{#snippet child({ props })}
				{@render trigger({ props })}
			{/snippet}
		</DialogPrimitive.Trigger>
	{/if}

	<DialogPrimitive.Portal>
		<DialogPrimitive.Overlay
			class="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]"
		/>
		<DialogPrimitive.Content
			class={cn(
				"border-line bg-surface fixed top-1/2 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-lg border p-5 shadow-2xl duration-150",
				"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
				"before:bg-accent before:absolute before:inset-x-5 before:top-0 before:h-0.5 before:rounded-full",
				className
			)}
		>
			<div class="flex items-start justify-between gap-4">
				<div class="space-y-1">
					<DialogPrimitive.Title class="font-display text-lg leading-tight font-semibold tracking-tight">{title}</DialogPrimitive.Title>
					{#if description}
						<DialogPrimitive.Description class="text-dim text-sm">{description}</DialogPrimitive.Description>
					{/if}
				</div>
				<DialogPrimitive.Close class="ring-focus text-dim hover:bg-raised hover:text-text -mt-1 -mr-1 rounded-md p-1 transition-colors">
					<XIcon class="size-4" />
					<span class="sr-only">Close</span>
				</DialogPrimitive.Close>
			</div>

			{@render children?.()}

			{#if footer}
				<div class="mt-1 flex justify-end gap-2">{@render footer()}</div>
			{/if}
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
