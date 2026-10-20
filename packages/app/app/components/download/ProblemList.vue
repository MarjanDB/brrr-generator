<script setup lang="ts">
import { CountNoun } from "~/types/counts";
import { ProblemState } from "~/types/reportProblems";

// The Problems tab's list: the report's problems grouped by kind, each a row naming what it is
// about and whether it is still open, then what the report left out that needs a look. A row
// shows its problem's card beside the list.
const { t } = useI18n();
const { countText } = useCountText();
const { dropSentence } = useProvenanceText();
const problems = useReportProblems();
const { groups, leftOut, selected, selectedLeftOut, select, titleOf, definesPayer, leftOutKey } =
	problems;

// A group's name, with how many it holds on the right.
const groupHeading = "flex items-baseline justify-between px-2 pt-3 pb-1 text-subheading";
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <section v-for="group in groups" :key="group.kind" class="flex flex-col gap-0.5">
      <h3 :class="groupHeading">
        {{ t(warningGroupKeys[group.kind]) }}
        <span class="text-meta tabular-nums">{{ group.problems.length }}</span>
      </h3>
      <button
        v-for="problem in group.problems"
        :key="problem.key"
        type="button"
        :aria-pressed="problem === selected"
        class="w-full flex items-center gap-2 text-left px-2 py-1.5 app-focus-ring-inset"
        :class="problem === selected ? 'row-selected' : 'row-selectable'"
        @click="select(problem.key)"
      >
        <InstrumentMonogram
          :ticker="problem.entry.contract?.underlyingSymbol ?? problem.entry.ticker"
          :large="false"
          :unknown="problem.state === ProblemState.OPEN && definesPayer(problem.kind)"
        />
        <span class="min-w-0 flex-1">
          <span class="block text-label truncate">{{ titleOf(problem) }}</span>
          <span class="block text-meta truncate">
            {{ t('problems_row_meta', { title: problem.title, lines: countText(CountNoun.FORM_LINE, problem.lineCount) }) }}
          </span>
        </span>
        <span
          v-if="problem.state === ProblemState.RESOLVED"
          class="inline-flex items-center gap-1 text-xs font-medium text-success-ink"
        >
          <span class="i-mdi-check-circle-outline" aria-hidden="true" />
          {{ t('problems_resolved') }}
        </span>
        <AppTooltip v-else :content="t('problems_open')">
          <span class="i-mdi-alert-outline text-warning-ink" :aria-label="t('problems_open')" />
        </AppTooltip>
      </button>
    </section>

    <section v-if="leftOut.length > 0" class="flex flex-col gap-0.5">
      <h3 :class="groupHeading">
        {{ t('download_category_needs_look') }}
        <span class="text-meta tabular-nums">{{ leftOut.length }}</span>
      </h3>
      <button
        v-for="(group, index) in leftOut"
        :key="index"
        type="button"
        :aria-pressed="group === selectedLeftOut"
        class="w-full flex items-center gap-2 text-left px-2 py-1.5 app-focus-ring-inset"
        :class="group === selectedLeftOut ? 'row-selected' : 'row-selectable'"
        @click="select(leftOutKey(index))"
      >
        <span class="i-mdi-alert-circle-outline shrink-0 text-danger-ink" aria-hidden="true" />
        <span class="flex-1 min-w-0 text-body">{{ dropSentence(group.drop) }}</span>
        <AppBadge>{{ group.items.length }}</AppBadge>
      </button>
    </section>
  </div>
</template>
