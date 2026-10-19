<script setup lang="ts">
import { CalendarDate, type DateValue } from "@internationalized/date";
import {
	YearPickerCell,
	YearPickerCellTrigger,
	YearPickerGrid,
	YearPickerGridBody,
	YearPickerGridRow,
	YearPickerHeader,
	YearPickerHeading,
	YearPickerNext,
	YearPickerPrev,
	YearPickerRoot,
} from "reka-ui";

const props = defineProps<{
	// The years the import has something in, oldest first; every other year is disabled.
	years: number[];
}>();

const year = defineModel<number>({ required: true });

const { t, locale } = useI18n();
const open = ref(false);

// reka's picker works in dates; a year is its first day.
const value = computed(() => new CalendarDate(year.value, 1, 1));
const minValue = computed(() => {
	const first = props.years[0];
	return first === undefined ? undefined : new CalendarDate(first, 1, 1);
});
const maxValue = computed(() => {
	const last = props.years.at(-1);
	return last === undefined ? undefined : new CalendarDate(last, 12, 31);
});

function isYearDisabled(date: DateValue): boolean {
	return !props.years.includes(date.year);
}

function onPicked(picked: DateValue | DateValue[] | undefined) {
	if (picked !== undefined && !Array.isArray(picked)) {
		year.value = picked.year;
		open.value = false;
	}
}
</script>

<template>
	<AppPopover v-model:open="open" :aria-label="t('tax_year_label')">
		<template #trigger>
			<button
				type="button"
				class="input-md flex items-center gap-2 cursor-pointer app-focus-ring"
				:aria-label="t('tax_year_button', { year })"
			>
				<span class="i-mdi-calendar-blank-outline text-ink-muted" aria-hidden="true" />
				<span class="font-medium">{{ year }}</span>
				<span class="i-mdi-chevron-down text-ink-muted" aria-hidden="true" />
			</button>
		</template>

		<YearPickerRoot
			v-slot="{ grid }"
			:model-value="value"
			:min-value="minValue"
			:max-value="maxValue"
			:is-year-disabled="isYearDisabled"
			:locale="locale"
			:calendar-label="t('tax_year_label')"
			:years-per-page="12"
			prevent-deselect
			initial-focus
			class="flex flex-col gap-2 w-60"
			@update:model-value="onPicked"
		>
			<YearPickerHeader class="flex items-center justify-between gap-2">
				<YearPickerPrev class="button-ghost p-1 disabled:opacity-40" :aria-label="t('tax_year_previous')">
					<span class="i-mdi-chevron-left text-lg block" aria-hidden="true" />
				</YearPickerPrev>
				<YearPickerHeading class="text-label" />
				<YearPickerNext class="button-ghost p-1 disabled:opacity-40" :aria-label="t('tax_year_next')">
					<span class="i-mdi-chevron-right text-lg block" aria-hidden="true" />
				</YearPickerNext>
			</YearPickerHeader>
			<YearPickerGrid class="w-full border-collapse">
				<YearPickerGridBody class="flex flex-col gap-1">
					<YearPickerGridRow v-for="(row, index) in grid.rows" :key="index" class="grid grid-cols-4 gap-1">
						<YearPickerCell v-for="cell in row" :key="cell.toString()" :date="cell">
							<YearPickerCellTrigger
								:year="cell"
								class="w-full rounded-sm py-1.5 text-sm text-center app-text cursor-pointer transition-colors hover:bg-surface-hover data-[selected]:bg-accent data-[selected]:text-accent-on data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-muted data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent app-focus-ring"
							/>
						</YearPickerCell>
					</YearPickerGridRow>
				</YearPickerGridBody>
			</YearPickerGrid>
		</YearPickerRoot>
	</AppPopover>
</template>
