<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";

	import { cn } from "$lib/utils";

	type Props = { class?: string; ref?: HTMLInputElement | null; value?: unknown } & HTMLInputAttributes;

	let { class: className, ref = $bindable(null), value = $bindable(), ...rest }: Props = $props();
</script>

<input
	bind:this={ref}
	bind:value
	class={cn(
		"ring-focus border-line bg-raised text-text placeholder:text-dim/70 h-11 w-full rounded-md border px-3 text-base transition-colors",
		"hover:border-line/80 focus:border-accent disabled:opacity-50",
		className
	)}
	{...rest}
/>
