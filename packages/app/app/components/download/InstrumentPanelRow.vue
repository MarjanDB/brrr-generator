<script setup lang="ts">
import { OptionRight } from "@brrr/lib";
import { DateTime } from "luxon";
import { computed } from "vue";
import AppBadge from "~/components/ui/AppBadge.vue";
import AppTooltip from "~/components/ui/AppTooltip.vue";
import type { PanelEntry } from "~/types/instrumentPanel";
import { ColorIntent } from "~/types/ui";

const props = defineProps<{
	entry: PanelEntry;
	selected: boolean;
	// A contract row, under its underlying
	compact: boolean;
}>();

const emit = defineEmits<{
	select: [];
}>();

const { t, locale } = useI18n();

const isCall = computed(() => props.entry.contract?.right === OptionRight.CALL);
const expiry = computed(() => {
	const contract = props.entry.contract;
	return contract === null
		? ""
		: DateTime.fromISO(contract.expiry).setLocale(locale.value).toLocaleString(DateTime.DATE_MED);
});
</script>

<template>
  <AppTooltip v-if="compact && entry.contract" :content="entry.contract.occSymbol" side="right">
    <button
      type="button"
      :aria-pressed="selected"
      @click="emit('select')"
      class="w-full flex items-center gap-2 text-left rounded-r-md py-1 pl-3 pr-1.5 ml-3 border-l border-edge transition-colors"
      :class="selected ? 'bg-action-soft' : 'hover:bg-surface-hover'"
    >
      <AppBadge :color="isCall ? ColorIntent.SUCCESS : ColorIntent.DANGER">
        {{ isCall ? t('download_option_call_short') : t('download_option_put_short') }}
      </AppBadge>
      <span class="font-semibold text-sm tabular-nums">{{ formatNumber(entry.contract.strike, locale) }}</span>
      <span class="text-xs text-ink-muted flex-1 truncate">{{ expiry }}</span>
      <AppTooltip v-if="entry.warningCount > 0" :content="t('download_badge_warnings', { n: entry.warningCount })">
        <AppBadge :color="ColorIntent.WARNING" class="gap-1">
          <span class="i-mdi-alert-outline" />
          {{ entry.warningCount }}
        </AppBadge>
      </AppTooltip>
      <AppTooltip v-if="entry.notInReport > 0" :content="t('download_badge_not_in_report', { n: entry.notInReport })">
        <AppBadge :color="ColorIntent.NEUTRAL">{{ entry.notInReport }}</AppBadge>
      </AppTooltip>
      <AppTooltip :content="t('download_badge_lines', { n: entry.lineCount })">
        <AppBadge :color="ColorIntent.SUCCESS">{{ entry.lineCount }}</AppBadge>
      </AppTooltip>
    </button>
  </AppTooltip>

  <button
    v-else
    type="button"
    :aria-pressed="selected"
    @click="emit('select')"
    class="w-full flex items-center gap-2 text-left rounded-md p-1.5 transition-colors"
    :class="selected ? 'bg-action-soft' : 'hover:bg-surface-hover'"
  >
    <InstrumentMonogram :ticker="entry.ticker" :large="false" />
    <span class="min-w-0 flex-1">
      <span class="flex items-center gap-1.5 font-semibold text-sm text-ink">
        <span class="truncate">{{ entry.ticker }}</span>
        <AppTooltip v-if="entry.hasCorporateAction" :content="t('download_badge_corporate_action')">
          <span class="i-mdi-call-split text-accent-ink" />
        </AppTooltip>
      </span>
      <span class="block text-xs text-ink-muted truncate">{{ entry.isin }}</span>
    </span>
    <AppTooltip v-if="entry.warningCount > 0" :content="t('download_badge_warnings', { n: entry.warningCount })">
      <AppBadge :color="ColorIntent.WARNING" class="gap-1">
        <span class="i-mdi-alert-outline" />
        {{ entry.warningCount }}
      </AppBadge>
    </AppTooltip>
    <AppTooltip v-if="entry.notInReport > 0" :content="t('download_badge_not_in_report', { n: entry.notInReport })">
      <AppBadge :color="ColorIntent.NEUTRAL">{{ entry.notInReport }}</AppBadge>
    </AppTooltip>
    <AppTooltip :content="t('download_badge_lines', { n: entry.lineCount })">
      <AppBadge :color="ColorIntent.SUCCESS">{{ entry.lineCount }}</AppBadge>
    </AppTooltip>
  </button>
</template>
