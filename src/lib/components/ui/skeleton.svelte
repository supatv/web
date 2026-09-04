<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "$lib/utils";

	let { class: className, ...rest }: { class?: string } & HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn("bg-raised animate-pulse rounded-md", className)} {...rest}></div>
