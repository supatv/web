<script lang="ts">
	import { Trash2Icon } from "@lucide/svelte";

	import { cn } from "$lib/utils";

	let { class: className }: { class?: string } = $props();
</script>

<div class={cn("text-dim/80 flex min-w-0 items-center gap-x-0.5 text-xs leading-5", className)}>
	<Trash2Icon class="size-4 shrink-0" />
	<span class="truncate">This message was deleted</span>
</div>
