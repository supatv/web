<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@lucide/svelte";

	import { cn } from "$lib/utils";

	type Props = {
		class?: string;
		months?: number[];
		years?: number[];
	} & CalendarPrimitive.RootProps;

	let { class: className, months: monthList, years: yearList, value = $bindable(), placeholder = $bindable(), ...rest }: Props = $props();

	const nav = "ring-focus text-dim hover:bg-raised hover:text-text grid size-7 place-items-center rounded-md transition-colors disabled:opacity-30";
	const dropdown = "ring-focus border-line bg-raised hover:border-accent relative flex h-7 items-center gap-1 rounded-md border pr-1 pl-2 text-xs font-medium transition-colors";
</script>

<CalendarPrimitive.Root bind:value={value as never} bind:placeholder weekdayFormat="short" class={cn("tnum w-fit p-3", className)} monthFormat="short" yearFormat="numeric" {...rest}>
	{#snippet children({ months, weekdays })}
		<div class="mb-2 flex items-center justify-between gap-1">
			<CalendarPrimitive.PrevButton class={nav}>
				<ChevronLeftIcon class="size-4" />
			</CalendarPrimitive.PrevButton>

			<div class="flex items-center gap-1">
				<CalendarPrimitive.MonthSelect months={monthList} class="absolute inset-0 cursor-pointer opacity-0">
					{#snippet child({ props, monthItems, selectedMonthItem })}
						<span class={dropdown}>
							<span>{selectedMonthItem.label}</span>
							<ChevronDownIcon class="text-dim size-3" />
							<select {...props}>
								{#each monthItems as item (item.value)}
									<option value={item.value} selected={item.value === selectedMonthItem.value}>{item.label}</option>
								{/each}
							</select>
						</span>
					{/snippet}
				</CalendarPrimitive.MonthSelect>

				<CalendarPrimitive.YearSelect years={yearList} class="absolute inset-0 cursor-pointer opacity-0">
					{#snippet child({ props, yearItems, selectedYearItem })}
						<span class={dropdown}>
							<span>{selectedYearItem.label}</span>
							<ChevronDownIcon class="text-dim size-3" />
							<select {...props}>
								{#each yearItems as item (item.value)}
									<option value={item.value} selected={item.value === selectedYearItem.value}>{item.label}</option>
								{/each}
							</select>
						</span>
					{/snippet}
				</CalendarPrimitive.YearSelect>
			</div>

			<CalendarPrimitive.NextButton class={nav}>
				<ChevronRightIcon class="size-4" />
			</CalendarPrimitive.NextButton>
		</div>

		{#each months as month (month.value)}
			<CalendarPrimitive.Grid class="w-full border-collapse">
				<CalendarPrimitive.GridHead>
					<CalendarPrimitive.GridRow class="flex">
						{#each weekdays as weekday (weekday)}
							<CalendarPrimitive.HeadCell class="text-dim size-8 text-[0.65rem] font-medium">
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
											"ring-focus grid size-8 place-items-center rounded-md text-xs transition-colors",
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
