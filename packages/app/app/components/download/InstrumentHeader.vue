<script setup lang="ts">
import { OptionRight } from "@brrr/lib";
import { computed } from "vue";
import { ProblemState } from "~/types/reportProblems";
import { ColorIntent } from "~/types/ui";

// The card's instrument: its name, identifier and corporate actions, and the report's problem about
// it, with a way to it.
const { entry } = useInstrumentCard();
const chips = chipsOf(entry.instrument);

const { t, locale } = useI18n();
const { chipText, date: dateText } = useProvenanceText();
const { problemOf, sentenceOf, review } = useReportProblems();

const problem = computed(() => problemOf(entry.instrument));
const open = computed(() => problem.value?.state === ProblemState.OPEN);
const unknown = computed(
	() => problem.value !== null && open.value && definesPayer(problem.value.kind),
);

// An option wears its underlying's monogram.
const monogramTicker = computed(() => entry.contract?.underlyingSymbol ?? entry.ticker);

const title = computed(() => {
	const contract = entry.contract;
	if (contract === null) {
		return entry.ticker;
	}
	const right =
		contract.right === OptionRight.CALL ? t("download_option_call") : t("download_option_put");
	return `${contract.underlyingSymbol} ${formatNumber(contract.strike, locale.value)} ${right}`;
});

const subtitle = computed(() => {
	const contract = entry.contract;
	if (contract === null) {
		return entry.isin ?? "";
	}
	return t("download_option_expires", {
		symbol: contract.occSymbol,
		date: dateText(contract.expiry),
	});
});
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center gap-3 px-4 pt-3 pb-1 flex-wrap">
      <InstrumentMonogram :ticker="monogramTicker" :large="true" :unknown="unknown" />
      <div class="min-w-0">
        <h3 class="text-heading leading-tight">{{ title }}</h3>
        <p class="text-meta">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-1.5 flex-wrap">
        <AppBadge v-if="entry.contract !== null" pill>
          {{ t('download_chip_option') }}
        </AppBadge>
        <AppBadge v-for="(chip, index) in chips" :key="index" :color="ColorIntent.ACCENT" pill class="gap-1">
          <span class="i-mdi-call-split" aria-hidden="true" />
          {{ chipText(chip) }}
        </AppBadge>
      </div>
    </div>
    <AppCallout
      v-if="problem !== null"
      :color="open ? ColorIntent.WARNING : ColorIntent.SUCCESS"
      class="mx-4 mt-2 flex items-start gap-2"
    >
      <span :class="open ? 'i-mdi-alert-outline' : 'i-mdi-check-circle-outline'" class="shrink-0 mt-0.5" aria-hidden="true" />
      <span class="flex-1">{{ sentenceOf(problem) }}</span>
      <button
        type="button"
        class="shrink-0 font-medium underline underline-offset-2 rounded-sm cursor-pointer hover:text-ink app-focus-ring"
        @click="review(problem.key)"
      >
        {{ t('problems_review') }}
      </button>
    </AppCallout>
  </div>
</template>
