<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export const button = tv({
		base: "ring-focus font-display inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		variants: {
			variant: {
				accent: "bg-accent text-accent-ink hover:brightness-110",
				solid: "bg-raised text-text hover:bg-line",
				outline: "border-line bg-surface text-text hover:border-accent hover:text-accent border",
				ghost: "text-dim hover:bg-raised hover:text-text",
			},
			size: {
				sm: "h-7 px-2 text-xs [&_svg]:size-3.5",
				md: "h-9 px-3.5 text-sm [&_svg]:size-4",
				icon: "size-8 [&_svg]:size-4",
				"icon-sm": "size-7 [&_svg]:size-3.5",
			},
		},
		defaultVariants: { variant: "solid", size: "md" },
	});

	export type ButtonVariant = VariantProps<typeof button>["variant"];
	export type ButtonSize = VariantProps<typeof button>["size"];
</script>

<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

	import { cn } from "$lib/utils";

	type Props = {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
		href?: string;
		children?: Snippet;
	} & HTMLButtonAttributes &
		HTMLAnchorAttributes;

	let { variant, size, class: className, href, children, ...rest }: Props = $props();
</script>

{#if href}
	<a {href} class={cn(button({ variant, size }), className)} {...rest}>{@render children?.()}</a>
{:else}
	<button type="button" class={cn(button({ variant, size }), className)} {...rest}>{@render children?.()}</button>
{/if}
