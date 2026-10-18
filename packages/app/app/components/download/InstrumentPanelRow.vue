<script setup lang="ts">
import { OptionRight } from "@brrr/lib";
import { DateTime } from "luxon";
import { computed } from "vue";
import AppBadge from "~/components/ui/AppBadge.vue";
import AppTooltip from "~/components/ui/AppTooltip.vue";
import { monogramIntent, monogramText } from "~/download/panel/monogramIntent";
import type { PanelEntry } from "~/download/panel/PanelEntry";
import { ColorIntent } from "~/utils/ColorIntent";

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

const monogram = computed(() => monogramText(props.entry.ticker));
const monogramClass = computed(() => monogramClasses[monogramIntent(props.entry.ticker)]);
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
      <span
        class="text-xs font-bold rounded-sm px-1 leading-4"
        :class="isCall ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink'"
      >
        {{ isCall ? t('download_option_call_short') : t('download_option_put_short') }}
      </span>
      <span class="font-semibold text-sm tabular-nums">{{ entry.contract.strike }}</span>
      <span class="text-xs text-ink-muted flex-1 truncate">{{ expiry }}</span>
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
    <span
      class="size-8 shrink-0 rounded-md grid place-items-center text-xs font-bold"
      :class="monogramClass"
    >
      {{ monogram }}
    </span>
    <span class="min-w-0 flex-1">
      <span class="flex items-center gap-1.5 font-semibold text-sm text-ink">
        <span class="truncate">{{ entry.ticker }}</span>
        <AppTooltip v-if="entry.hasCorporateAction" :content="t('download_badge_corporate_action')">
          <span class="i-mdi-call-split text-accent-ink" />
        </AppTooltip>
      </span>
      <span class="block text-xs text-ink-muted truncate">{{ entry.isin }}</span>
    </span>
    <AppTooltip v-if="entry.notInReport > 0" :content="t('download_badge_not_in_report', { n: entry.notInReport })">
      <AppBadge :color="ColorIntent.NEUTRAL">{{ entry.notInReport }}</AppBadge>
    </AppTooltip>
    <AppTooltip :content="t('download_badge_lines', { n: entry.lineCount })">
      <AppBadge :color="ColorIntent.SUCCESS">{{ entry.lineCount }}</AppBadge>
    </AppTooltip>
  </button>
</template>
