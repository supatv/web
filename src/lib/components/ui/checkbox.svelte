<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from "bits-ui";
	import { CheckIcon, MinusIcon } from "@lucide/svelte";

	import { cn } from "$lib/utils";

	type Props = { class?: string } & CheckboxPrimitive.RootProps;

	let { class: className, checked = $bindable(false), indeterminate = $bindable(false), ...rest }: Props = $props();
</script>

<CheckboxPrimitive.Root
	bind:checked
	bind:indeterminate
	class={cn(
		"ring-focus border-line bg-surface grid size-6 shrink-0 place-items-center rounded-[5px] border transition-colors",
		"hover:border-accent checked:bg-accent checked:border-accent checked:text-accent-ink disabled:opacity-50",
		className
	)}
	{...rest}
>
	{#snippet children({ checked, indeterminate })}
		{#if indeterminate}
			<MinusIcon class="size-4" />
		{:else if checked}
			<CheckIcon class="size-4" strokeWidth={3} />
		{/if}
	{/snippet}
</CheckboxPrimitive.Root>
