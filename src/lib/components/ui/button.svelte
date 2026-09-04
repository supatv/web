<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export const button = tv({
		base: "ring-focus font-display inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		variants: {
			variant: {
				accent: "bg-accent text-accent-ink hover:brightness-110",
				solid: "bg-raised text-text hover:bg-line",
				outline: "border-line bg-surface text-text hover:border-accent hover:text-accent border",
				ghost: "text-dim hover:bg-raised hover:text-text",
			},
			size: {
				sm: "h-9 px-3 text-sm [&_svg]:size-4",
				md: "h-11 px-4 text-base [&_svg]:size-4.5",
				icon: "size-11 [&_svg]:size-5",
				"icon-sm": "size-9 [&_svg]:size-4",
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
