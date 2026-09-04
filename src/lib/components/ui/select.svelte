<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export type SelectOption = { value: string; label: string; separatorBefore?: boolean };

	export const selectTrigger = tv({
		base: "field-focus border-line bg-surface text-text hover:border-accent focus-visible:border-accent open:border-accent flex items-center justify-between gap-2 rounded-md border transition-colors disabled:opacity-50",
		variants: {
			size: {
				sm: "h-9 px-2.5 text-sm",
				md: "h-11 px-3 text-base",
			},
		},
		defaultVariants: { size: "md" },
	});

	export type SelectSize = VariantProps<typeof selectTrigger>["size"];
</script>

<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { CheckIcon, ChevronDownIcon } from "@lucide/svelte";

	import { cn } from "$lib/utils";
	import FocusTrap from "./focus-trap.svelte";

	type Props = {
		value?: string;
		open?: boolean;
		options: SelectOption[];
		size?: SelectSize;
		onValueChange?: (value: string) => void;
		placeholder?: string;
		disabled?: boolean;
		id?: string;
		class?: string;
		contentClass?: string;
		"aria-label"?: string;
	};

	let {
		value = $bindable(""),
		open = $bindable(false),
		options,
		size,
		onValueChange,
		placeholder = "Select",
		disabled = false,
		id,
		class: className,
		contentClass,
		"aria-label": ariaLabel,
	}: Props = $props();

	const label = $derived(options.find((o) => o.value === value)?.label ?? placeholder);
</script>

<SelectPrimitive.Root type="single" bind:value bind:open {onValueChange} {disabled}>
	<SelectPrimitive.Trigger {id} aria-label={ariaLabel} class={cn(selectTrigger({ size }), className)}>
		<span class="truncate">{label}</span>
		<ChevronDownIcon class="text-dim size-4 shrink-0" />
	</SelectPrimitive.Trigger>

	<SelectPrimitive.Portal>
		{#if open}
			<FocusTrap />
		{/if}

		<SelectPrimitive.Content
			sideOffset={6}
			class={cn(
				"border-line bg-surface z-50 max-h-[min(18rem,var(--bits-floating-available-height))] min-w-(--bits-floating-anchor-width) overflow-y-auto overscroll-contain rounded-lg border p-1 shadow-xl duration-150 [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]",
				"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
				contentClass
			)}
		>
			<!-- bits-ui makes the viewport the scroll container and hides its scrollbar with !important; scroll on the content instead -->
			<SelectPrimitive.Viewport class="overflow-visible!">
				{#each options as option (option.value)}
					{#if option.separatorBefore}
						<div class="bg-line my-1 h-px" role="none"></div>
					{/if}
					<SelectPrimitive.Item value={option.value} label={option.label}>
						{#snippet child({ props, selected })}
							<div
								{...props}
								class={cn(
									"flex h-9 cursor-pointer items-center justify-between gap-2 rounded-[5px] px-2.5 transition-colors outline-none",
									size === "sm" ? "text-sm" : "text-base",
									"data-highlighted:bg-raised data-highlighted:text-text",
									selected && "text-accent font-medium"
								)}
							>
								<span class="truncate">{option.label}</span>
								{#if selected}
									<CheckIcon class="size-4 shrink-0" />
								{/if}
							</div>
						{/snippet}
					</SelectPrimitive.Item>
				{/each}
			</SelectPrimitive.Viewport>
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
</SelectPrimitive.Root>
