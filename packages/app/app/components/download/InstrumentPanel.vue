<script setup lang="ts">
import type { ReportInstrument } from "@brrr/lib";
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from "reka-ui";
import { computed, ref } from "vue";
import InstrumentPanelRow from "~/components/download/InstrumentPanelRow.vue";
import { CountNoun } from "~/types/counts";
import type { PanelSections } from "~/types/instrumentPanel";

const props = defineProps<{
	sections: PanelSections;
	selected: ReportInstrument | null;
}>();

const emit = defineEmits<{
	select: [instrument: ReportInstrument];
}>();

const { t } = useI18n();
const { countText } = useCountText();

// A group's name, with how many it holds on the right.
const groupHeading = "flex items-baseline justify-between px-2 pt-3 pb-1 text-subheading";

const query = ref("");
const withoutLinesOpen = ref(false);

const shown = computed(() => filterPanel(props.sections, query.value));
const searching = computed(() => query.value.trim() !== "");
// "Not in this report" is collapsed until asked for, and open while a search is looking through it
// or the selected instrument is in it.
const holdsSelected = computed(() =>
	props.sections.withoutLines.some((entry) => entry.instrument === props.selected),
);
const withoutLinesVisible = computed(
	() => withoutLinesOpen.value || searching.value || holdsSelected.value,
);
const isEmpty = computed(
	() =>
		shown.value.stocks.length === 0 &&
		shown.value.underlyings.length === 0 &&
		shown.value.payers.length === 0 &&
		shown.value.withoutLines.length === 0,
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- The input's own outline is off, so the box shows its focus. -->
    <div
      class="field flex items-center gap-2 text-ink-muted focus-within:border-accent-edge focus-within:ring-1 focus-within:ring-accent-edge"
    >
      <span class="i-mdi-magnify shrink-0" aria-hidden="true" />
      <input
        v-model="query"
        type="search"
        :placeholder="t('download_panel_search')"
        :aria-label="t('download_panel_search')"
        class="w-full min-w-0 bg-transparent text-ink placeholder:text-ink-muted outline-none"
      />
    </div>

    <p v-if="isEmpty" class="text-meta px-2 py-2">{{ t('download_panel_no_match') }}</p>

    <section v-if="shown.stocks.length > 0" class="flex flex-col gap-0.5">
      <h3 :class="groupHeading">
        {{ t('download_section_shares') }}
        <span class="text-meta tabular-nums">{{ shown.stocks.length }}</span>
      </h3>
      <InstrumentPanelRow
        v-for="entry in shown.stocks"
        :key="entry.instrument.node.id"
        :entry="entry"
        :selected="entry.instrument === selected"
        :compact="false"
        @select="emit('select', entry.instrument)"
      />
    </section>

    <section v-if="shown.underlyings.length > 0" class="flex flex-col gap-0.5">
      <h3 :class="groupHeading">
        {{ t('download_section_options') }}
        <span class="text-meta tabular-nums">{{ shown.underlyings.length }}</span>
      </h3>
      <div v-for="underlying in shown.underlyings" :key="underlying.symbol" class="flex flex-col gap-0.5">
        <div class="flex items-baseline justify-between px-2 pt-1">
          <span class="text-label">{{ underlying.symbol }}</span>
          <span class="text-meta">{{ countText(CountNoun.CONTRACT, underlying.contracts.length) }}</span>
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
      <h3 :class="groupHeading">
        {{ t('download_section_payers') }}
        <span class="text-meta tabular-nums">{{ shown.payers.length }}</span>
      </h3>
      <InstrumentPanelRow
        v-for="entry in shown.payers"
        :key="entry.instrument.node.id"
        :entry="entry"
        :selected="entry.instrument === selected"
        :compact="false"
        @select="emit('select', entry.instrument)"
      />
    </section>

    <CollapsibleRoot
      v-if="shown.withoutLines.length > 0"
      as="section"
      :open="withoutLinesVisible"
      class="flex flex-col gap-0.5"
      @update:open="(open) => (withoutLinesOpen = open)"
    >
      <CollapsibleTrigger
        class="flex w-full items-center gap-1 px-2 pt-3 pb-1 text-subheading text-ink-muted text-left cursor-pointer transition-colors hover:text-ink app-focus-ring-inset"
      >
        <span :class="withoutLinesVisible ? 'i-mdi-chevron-down' : 'i-mdi-chevron-right'" aria-hidden="true" />
        <span class="flex-1">{{ t('download_section_without_lines') }}</span>
        <span class="text-meta tabular-nums">{{ shown.withoutLines.length }}</span>
      </CollapsibleTrigger>
      <CollapsibleContent class="flex flex-col gap-0.5">
        <InstrumentPanelRow
          v-for="entry in shown.withoutLines"
          :key="entry.instrument.node.id"
          :entry="entry"
          :selected="entry.instrument === selected"
          :compact="entry.contract !== null"
          @select="emit('select', entry.instrument)"
        />
      </CollapsibleContent>
    </CollapsibleRoot>
  </div>
</template>
