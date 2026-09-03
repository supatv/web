<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export const input = tv({
		base: "ring-focus border-line bg-raised text-text placeholder:text-dim/70 w-full rounded-md border transition-colors hover:border-line/80 focus:border-accent disabled:opacity-50",
		variants: {
			size: {
				sm: "h-9 px-2.5 text-sm",
				md: "h-11 px-3 text-base",
			},
		},
		defaultVariants: { size: "md" },
	});

	export type InputSize = VariantProps<typeof input>["size"];
</script>

<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";

	import { cn } from "$lib/utils";

	type Props = { size?: InputSize; class?: string; ref?: HTMLInputElement | null; value?: unknown } & Omit<HTMLInputAttributes, "size">;

	let { size, class: className, ref = $bindable(null), value = $bindable(), ...rest }: Props = $props();
</script>

<input bind:this={ref} bind:value class={cn(input({ size }), className)} {...rest} />
