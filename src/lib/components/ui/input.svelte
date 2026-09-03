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
		"ring-focus border-line bg-raised text-text placeholder:text-dim/70 h-9 w-full rounded-md border px-2.5 text-sm transition-colors",
		"hover:border-line/80 focus:border-accent disabled:opacity-40",
		className
	)}
	{...rest}
/>
