<script setup lang="ts">
import { OptionRight } from "@brrr/lib";
import { DateTime } from "luxon";
import { computed } from "vue";
import { CorporateActionChipKind } from "~/download/labels/CorporateActionChipKind";
import type { SplitChip } from "~/download/labels/SplitChip";
import { monogramIntent, monogramText } from "~/download/panel/monogramIntent";
import type { PanelEntry } from "~/download/panel/PanelEntry";
import { ColorIntent } from "~/utils/ColorIntent";

const props = defineProps<{
	entry: PanelEntry;
	chips: SplitChip[];
}>();

const { t, locale } = useI18n();

// UnoCSS only sees class strings written out in full.
const monogramClasses: Record<ColorIntent, string> = {
	[ColorIntent.ACTION]: "bg-action-soft text-action-ink",
	[ColorIntent.ACCENT]: "bg-accent-soft text-accent-ink",
	[ColorIntent.NEUTRAL]: "bg-neutral-soft text-neutral-ink",
	[ColorIntent.SUCCESS]: "bg-success-soft text-success-ink",
	[ColorIntent.WARNING]: "bg-warning-soft text-warning-ink",
	[ColorIntent.DANGER]: "bg-danger-soft text-danger-ink",
	[ColorIntent.INFO]: "bg-info-soft text-info-ink",
};

const monogram = computed(() => {
	const contract = props.entry.contract;
	return monogramText(contract === null ? props.entry.ticker : contract.underlyingSymbol);
});
const monogramClass = computed(() => {
	const contract = props.entry.contract;
	return monogramClasses[
		monogramIntent(contract === null ? props.entry.ticker : contract.underlyingSymbol)
	];
});

const title = computed(() => {
	const contract = props.entry.contract;
	if (contract === null) {
		return props.entry.ticker;
	}
	const right =
		contract.right === OptionRight.CALL ? t("download_option_call") : t("download_option_put");
	return `${contract.underlyingSymbol} ${contract.strike} ${right}`;
});

const subtitle = computed(() => {
	const contract = props.entry.contract;
	if (contract === null) {
		return props.entry.isin ?? "";
	}
	const date = DateTime.fromISO(contract.expiry)
		.setLocale(locale.value)
		.toLocaleString(DateTime.DATE_MED);
	return t("download_option_expires", { date });
});

const identifier = computed(() => props.entry.contract?.occSymbol ?? props.entry.isin ?? "");

function chipText(chip: SplitChip): string {
	const params = {
		before: chip.before ?? "",
		after: chip.after ?? "",
		isin: chip.fromIsin ?? "",
		ticker: chip.fromTicker ?? "",
	};
	const keys: Record<CorporateActionChipKind, string> = {
		[CorporateActionChipKind.SPLIT]: "download_chip_split",
		[CorporateActionChipKind.REVERSE_SPLIT]: "download_chip_reverse_split",
		[CorporateActionChipKind.RENAME]: "download_chip_rename",
	};
	return t(keys[chip.kind], params);
}
</script>

<template>
  <div class="flex items-center gap-3 px-4 pt-3 pb-1 flex-wrap">
    <span
      class="size-10 shrink-0 rounded-lg grid place-items-center text-sm font-bold"
      :class="monogramClass"
    >
      {{ monogram }}
    </span>
    <div class="min-w-0">
      <h3 class="text-lg font-bold text-ink leading-tight">{{ title }}</h3>
      <p class="text-sm text-ink-muted">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-1.5 flex-wrap">
      <span
        v-if="identifier !== ''"
        class="inline-flex items-center rounded-full border border-edge bg-surface-raised px-2 py-0.5 text-xs font-mono text-ink-muted"
      >
        {{ identifier }}
      </span>
      <span
        v-if="entry.contract !== null"
        class="inline-flex items-center rounded-full border border-edge bg-surface-raised px-2 py-0.5 text-xs text-ink-muted"
      >
        {{ t('download_chip_option') }}
      </span>
      <span
        v-for="(chip, index) in chips"
        :key="index"
        class="inline-flex items-center gap-1 rounded-full border border-accent-edge bg-accent-soft px-2 py-0.5 text-xs text-accent-ink"
      >
        <span class="i-mdi-call-split" />
        {{ chipText(chip) }}
      </span>
    </div>
  </div>
</template>
