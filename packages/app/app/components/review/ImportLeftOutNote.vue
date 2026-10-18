<script setup lang="ts">
import type { ProvenanceGraph } from "@brrr/lib";
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from "reka-ui";
import { BadgeVariant, ColorIntent } from "~/types/ui";

const props = defineProps<{
  provenance: ProvenanceGraph;
}>();

const { t } = useI18n();
const { dropSentence } = useProvenanceText();
const leftOut = useImportLeftOut(() => props.provenance);

const open = ref(false);
const visible = computed(() => leftOut.value.needsALook > 0 || leftOut.value.merged.length > 0);
</script>

<template>
  <CollapsibleRoot
    v-if="visible"
    v-model:open="open"
    :class="
      leftOut.needsALook > 0
        ? 'rounded-md border border-warning-edge bg-warning-soft p-3'
        : 'rounded-md border border-edge bg-surface p-3'
    "
  >
    <CollapsibleTrigger class="w-full flex flex-wrap items-center gap-2 text-left">
      <span v-if="leftOut.needsALook > 0" class="flex items-center gap-1.5 text-sm font-medium text-warning-ink">
        <span class="i-mdi-alert-outline" />
        {{ t("review_left_out_count", { n: leftOut.needsALook }) }}
      </span>
      <AppBadge v-if="leftOut.merged.length > 0" :color="ColorIntent.INFO" :variant="BadgeVariant.SOFT" class="gap-1">
        <span class="i-mdi-call-merge" />
        {{ t("review_merged_count", { n: leftOut.merged.length }) }}
      </AppBadge>
      <span class="ml-auto flex items-center gap-1 text-xs app-text-muted">
        {{ open ? t("review_left_out_hide") : t("review_left_out_show") }}
        <span :class="open ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'" />
      </span>
    </CollapsibleTrigger>

    <CollapsibleContent class="flex flex-col gap-4 pt-3">
      <section v-if="leftOut.lines.length > 0" class="flex flex-col gap-3">
        <h3 class="text-label">{{ t("review_left_out_heading") }}</h3>
        <div v-for="(line, index) in leftOut.lines" :key="index" class="flex flex-col gap-1.5">
          <p class="text-sm app-text">{{ dropSentence(line.drop) }}</p>
          <div class="flex flex-col items-start gap-1">
            <FileChip v-for="file in line.files" :key="file" :name="file" />
            <div v-for="(source, rowIndex) in line.rows" :key="rowIndex" class="flex flex-wrap items-center gap-1.5">
              <FileChip :name="source.fileName" />
              <span class="font-mono text-xs app-text">{{ source.row.label }}</span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="leftOut.merged.length > 0" class="flex flex-col gap-3">
        <h3 class="text-label">{{ t("review_merged_heading") }}</h3>
        <div v-for="(entry, index) in leftOut.merged" :key="index" class="flex flex-wrap items-center gap-1.5">
          <span class="font-mono text-xs app-text">{{ entry.row.row.label }}</span>
          <FileChip :name="entry.row.fileName" />
          <FileChip v-for="(copy, copyIndex) in entry.alsoIn" :key="copyIndex" :name="copy.fileName" />
        </div>
      </section>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
