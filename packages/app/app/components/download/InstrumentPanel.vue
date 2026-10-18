<script setup lang="ts">
import type { ReportInstrument } from "@brrr/lib";
import { computed, ref } from "vue";
import InstrumentPanelRow from "~/components/download/InstrumentPanelRow.vue";
import { filterPanel } from "~/download/panel/filterPanel";
import type { PanelSections } from "~/download/panel/PanelSections";

const props = defineProps<{
	sections: PanelSections;
	selected: ReportInstrument | null;
}>();

const emit = defineEmits<{
	select: [instrument: ReportInstrument];
}>();

const { t } = useI18n();

const query = ref("");
const withoutLinesOpen = ref(false);

const shown = computed(() => filterPanel(props.sections, query.value));
const searching = computed(() => query.value.trim() !== "");
// "Not in this report" is collapsed until asked for, and open while a search is looking through it.
const withoutLinesVisible = computed(() => withoutLinesOpen.value || searching.value);
const isEmpty = computed(
	() =>
		shown.value.shares.length === 0 &&
		shown.value.underlyings.length === 0 &&
		shown.value.payers.length === 0 &&
		shown.value.withoutLines.length === 0,
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2 rounded-md border border-edge-strong bg-surface-raised px-2.5 py-1.5 text-ink-muted">
      <span class="i-mdi-magnify" />
      <input
        v-model="query"
        type="search"
        :placeholder="t('download_panel_search')"
        :aria-label="t('download_panel_search')"
        class="w-full bg-transparent text-sm text-ink outline-none"
      />
    </div>

    <p v-if="isEmpty" class="text-caption px-1.5 py-2">{{ t('download_panel_no_match') }}</p>

    <section v-if="shown.shares.length > 0" class="flex flex-col gap-0.5">
      <h3 class="text-xs uppercase tracking-wide text-ink-muted px-1.5 pt-2">{{ t('download_section_shares') }}</h3>
      <InstrumentPanelRow
        v-for="entry in shown.shares"
        :key="entry.instrument.node.id"
        :entry="entry"
        :selected="entry.instrument === selected"
        :compact="false"
        @select="emit('select', entry.instrument)"
      />
    </section>

    <section v-if="shown.underlyings.length > 0" class="flex flex-col gap-0.5">
      <h3 class="text-xs uppercase tracking-wide text-ink-muted px-1.5 pt-2">{{ t('download_section_options') }}</h3>
      <div v-for="underlying in shown.underlyings" :key="underlying.symbol" class="flex flex-col gap-0.5">
        <div class="flex items-baseline justify-between px-1.5 pt-1">
          <span class="font-semibold text-sm text-ink">{{ underlying.symbol }}</span>
          <span class="text-xs text-ink-muted">{{ t('download_underlying_contracts', { n: underlying.contracts.length }) }}</span>
        </div>
        <InstrumentPanelRow
          v-for="entry in underlying.contracts"
          :key="entry.instrument.node.id"
          :entry="entry"
          :selected="entry.instrument === selected"
          :compact="true"
          @select="emit('select', entry.instrument)"
        />
      </div>
    </section>

    <section v-if="shown.payers.length > 0" class="flex flex-col gap-0.5">
      <h3 class="text-xs uppercase tracking-wide text-ink-muted px-1.5 pt-2">{{ t('download_section_payers') }}</h3>
      <InstrumentPanelRow
        v-for="entry in shown.payers"
        :key="entry.instrument.node.id"
        :entry="entry"
        :selected="entry.instrument === selected"
        :compact="false"
        @select="emit('select', entry.instrument)"
      />
    </section>

    <section v-if="shown.withoutLines.length > 0" class="flex flex-col gap-0.5">
      <button
        type="button"
        :aria-expanded="withoutLinesVisible"
        class="flex items-center gap-1 text-xs uppercase tracking-wide text-ink-muted px-1.5 pt-2 text-left"
        @click="withoutLinesOpen = !withoutLinesOpen"
      >
        <span :class="withoutLinesVisible ? 'i-mdi-chevron-down' : 'i-mdi-chevron-right'" />
        {{ t('download_section_without_lines') }}
      </button>
      <template v-if="withoutLinesVisible">
        <InstrumentPanelRow
          v-for="entry in shown.withoutLines"
          :key="entry.instrument.node.id"
          :entry="entry"
          :selected="entry.instrument === selected"
          :compact="entry.contract !== null"
          @select="emit('select', entry.instrument)"
        />
      </template>
    </section>
  </div>
</template>
