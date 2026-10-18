<script setup lang="ts">
import { IdentifierChangeType, OptionRight } from "@brrr/lib";
import { computed } from "vue";
import type { PanelEntry, SplitChip } from "~/types/instrumentPanel";
import { ColorIntent } from "~/types/ui";

const props = defineProps<{
	entry: PanelEntry;
	chips: SplitChip[];
}>();

const { t, locale } = useI18n();
const { splitRatio, date: dateText } = useProvenanceText();

// An option wears its underlying's monogram.
const monogramTicker = computed(() => props.entry.contract?.underlyingSymbol ?? props.entry.ticker);

const title = computed(() => {
	const contract = props.entry.contract;
	if (contract === null) {
		return props.entry.ticker;
	}
	const right =
		contract.right === OptionRight.CALL ? t("download_option_call") : t("download_option_put");
	return `${contract.underlyingSymbol} ${formatNumber(contract.strike, locale.value)} ${right}`;
});

const subtitle = computed(() => {
	const contract = props.entry.contract;
	if (contract === null) {
		return props.entry.isin ?? "";
	}
	return t("download_option_expires", { date: dateText(contract.expiry) });
});

const identifier = computed(() => props.entry.contract?.occSymbol ?? props.entry.isin ?? "");

function chipText(chip: SplitChip): string {
	const ratio = splitRatio(chip);
	const params = {
		before: ratio?.before ?? chip.before ?? "",
		after: ratio?.after ?? chip.after ?? "",
		isin: chip.fromIsin ?? "",
		ticker: chip.fromTicker ?? "",
	};
	const keys: Record<IdentifierChangeType, string> = {
		[IdentifierChangeType.SPLIT]: "download_chip_split",
		[IdentifierChangeType.REVERSE_SPLIT]: "download_chip_reverse_split",
		[IdentifierChangeType.RENAME]: "download_chip_rename",
	};
	return t(keys[chip.kind], params);
}
</script>

<template>
  <div class="flex items-center gap-3 px-4 pt-3 pb-1 flex-wrap">
    <InstrumentMonogram :ticker="monogramTicker" :large="true" />
    <div class="min-w-0">
      <h3 class="text-lg font-bold text-ink leading-tight">{{ title }}</h3>
      <p class="text-sm text-ink-muted">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-1.5 flex-wrap">
      <AppBadge v-if="identifier !== ''" pill class="font-mono">
        {{ identifier }}
      </AppBadge>
      <AppBadge v-if="entry.contract !== null" pill>
        {{ t('download_chip_option') }}
      </AppBadge>
      <AppBadge v-for="(chip, index) in chips" :key="index" :color="ColorIntent.ACCENT" pill class="gap-1">
        <span class="i-mdi-call-split" aria-hidden="true" />
        {{ chipText(chip) }}
      </AppBadge>
    </div>
  </div>
</template>
