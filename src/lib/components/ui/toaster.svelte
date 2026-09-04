<script lang="ts">
	import { Toaster as Sonner, type ToasterProps } from "svelte-sonner";
	import { mode } from "mode-watcher";

	let { ...rest }: ToasterProps = $props();
</script>

<Sonner
	theme={mode.current}
	position="top-right"
	offset={{ top: "4.5rem" }}
	mobileOffset={{ top: "4rem" }}
	toastOptions={{
		classes: {
			toast: "!bg-surface !border-line !text-text !rounded-lg !font-sans !shadow-lg",
			description: "!text-dim",
			icon: "!text-accent",
		},
	}}
	{...rest}
/>
