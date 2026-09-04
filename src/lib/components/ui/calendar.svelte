<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import type { DateValue } from "@internationalized/date";

	import { cn } from "$lib/utils";
	import Select, { type SelectOption } from "./select.svelte";

	type Props = {
		class?: string;
		months?: number[];
		years?: number[];
	} & CalendarPrimitive.RootProps;

	let { class: className, months: monthList, years: yearList, value = $bindable(), placeholder = $bindable(), onPlaceholderChange, locale = "en-US", ...rest }: Props = $props();

	// writing the bound placeholder skips the setter bits-ui fires onPlaceholderChange from, so navigating by select has to announce itself
	const navigate = (date: DateValue) => {
		placeholder = date;
		onPlaceholderChange?.(date);
	};

	const monthName = $derived(new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }));

	// the shown month or year can sit outside the allowed list, and dropping it would leave the select blank
	const withShown = (list: number[], shown: number) => (list.includes(shown) ? list : [...list, shown].sort((a, b) => a - b));

	const monthOptions = (shown: number): SelectOption[] =>
		withShown(monthList?.length ? monthList : Array.from({ length: 12 }, (_, i) => i + 1), shown).map((month) => ({
			value: String(month),
			label: `${String(month).padStart(2, "0")} ${monthName.format(Date.UTC(2000, month - 1, 1))}`,
		}));

	const yearOptions = (shown: number): SelectOption[] => withShown(yearList ?? [], shown).map((year) => ({ value: String(year), label: String(year) }));
</script>

<CalendarPrimitive.Root
	bind:value={value as never}
	bind:placeholder
	{onPlaceholderChange}
	preventDeselect
	weekdayFormat="short"
	class={cn("w-fit p-3 tabular-nums", className)}
	monthFormat="short"
	yearFormat="numeric"
	{locale}
	{...rest}
>
	{#snippet children({ months, weekdays })}
		{@const shown = months[0].value}
		<div class="mb-2 flex items-center gap-1">
			<Select
				size="sm"
				aria-label="Year"
				options={yearOptions(shown.year)}
				value={String(shown.year)}
				onValueChange={(year) => navigate(shown.set({ year: Number(year) }))}
				class="min-w-1/3"
				contentClass="tabular-nums"
			/>
			<Select
				size="sm"
				aria-label="Month"
				options={monthOptions(shown.month)}
				value={String(shown.month)}
				onValueChange={(month) => navigate(shown.set({ month: Number(month) }))}
				class="min-w-0 flex-1"
				contentClass="tabular-nums"
			/>
		</div>

		{#each months as month (month.value)}
			<CalendarPrimitive.Grid class="w-full border-collapse">
				<CalendarPrimitive.GridHead>
					<CalendarPrimitive.GridRow class="flex py-2">
						{#each weekdays as weekday (weekday)}
							<CalendarPrimitive.HeadCell class="text-dim w-9 text-xs font-medium">
								{weekday.slice(0, 2)}
							</CalendarPrimitive.HeadCell>
						{/each}
					</CalendarPrimitive.GridRow>
				</CalendarPrimitive.GridHead>
				<CalendarPrimitive.GridBody>
					{#each month.weeks as week, i (i)}
						<CalendarPrimitive.GridRow class="flex w-full">
							{#each week as date (date)}
								<CalendarPrimitive.Cell {date} month={month.value} class="p-0">
									<CalendarPrimitive.Day
										class={cn(
											"ring-focus grid size-9 place-items-center rounded-md text-sm transition-colors select-none",
											"hover:bg-raised data-selected:bg-accent data-selected:text-accent-ink data-selected:font-semibold",
											"data-outside-month:opacity-30 data-unavailable:pointer-events-none data-unavailable:opacity-25",
											"data-today:text-accent data-selected:data-today:text-accent-ink data-today:font-semibold"
										)}
									/>
								</CalendarPrimitive.Cell>
							{/each}
						</CalendarPrimitive.GridRow>
					{/each}
				</CalendarPrimitive.GridBody>
			</CalendarPrimitive.Grid>
		{/each}
	{/snippet}
</CalendarPrimitive.Root>
