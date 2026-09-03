<script lang="ts" module>
	export type SelectOption = { value: string; label: string; separatorBefore?: boolean };
</script>

<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { CheckIcon, ChevronDownIcon } from "@lucide/svelte";

	import { cn } from "$lib/utils";

	type Props = {
		value?: string;
		open?: boolean;
		options: SelectOption[];
		placeholder?: string;
		disabled?: boolean;
		id?: string;
		class?: string;
		contentClass?: string;
		"aria-label"?: string;
	};

	let { value = $bindable(""), open = $bindable(false), options, placeholder = "Select", disabled = false, id, class: className, contentClass, "aria-label": ariaLabel }: Props = $props();

	const label = $derived(options.find((o) => o.value === value)?.label ?? placeholder);
</script>

<SelectPrimitive.Root type="single" bind:value bind:open {disabled}>
	<SelectPrimitive.Trigger
		{id}
		aria-label={ariaLabel}
		class={cn(
			"ring-focus border-line bg-raised text-text flex h-9 items-center justify-between gap-2 rounded-md border px-2.5 text-sm transition-colors",
			"hover:border-accent open:border-accent disabled:opacity-40",
			className
		)}
	>
		<span class="truncate">{label}</span>
		<ChevronDownIcon class="text-dim size-3.5 shrink-0" />
	</SelectPrimitive.Trigger>

	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			sideOffset={6}
			class={cn(
				"border-line bg-surface z-50 max-h-(--bits-floating-available-height) min-w-(--bits-floating-anchor-width) overflow-y-auto rounded-lg border p-1 shadow-xl duration-150",
				"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
				contentClass
			)}
		>
			<SelectPrimitive.Viewport>
				{#each options as option (option.value)}
					{#if option.separatorBefore}
						<div class="bg-line my-1 h-px" role="none"></div>
					{/if}
					<SelectPrimitive.Item value={option.value} label={option.label}>
						{#snippet child({ props, selected })}
							<div
								{...props}
								class={cn(
									"flex h-7 cursor-pointer items-center justify-between gap-2 rounded-[5px] px-2 text-sm transition-colors outline-none",
									"data-highlighted:bg-raised data-highlighted:text-text",
									selected && "text-accent font-medium"
								)}
							>
								<span class="truncate">{option.label}</span>
								{#if selected}
									<CheckIcon class="size-3.5 shrink-0" />
								{/if}
							</div>
						{/snippet}
					</SelectPrimitive.Item>
				{/each}
			</SelectPrimitive.Viewport>
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
</SelectPrimitive.Root>
