<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "$lib/utils";

	type Props = { class?: string; children?: Snippet } & HTMLAttributes<HTMLDivElement>;

	let { class: className, children, ...rest }: Props = $props();
</script>

<div class={cn("border-line bg-surface rounded-lg border", className)} {...rest}>
	{@render children?.()}
</div>
