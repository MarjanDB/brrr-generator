<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from "reka-ui";
import type { ImportLeftOut } from "~/types/importSources";
import { ColorIntent } from "~/types/ui";

defineProps<{
  leftOut: ImportLeftOut;
}>();

const { t } = useI18n();
const { dropSentence } = useProvenanceText();

const group = "rounded-md border app-border";
const groupTrigger =
	"w-full flex items-center gap-2 px-3 py-2 text-left rounded-md cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface-raised app-focus-ring";
</script>

<template>
  <p
    v-if="leftOut.lines.length === 0 && leftOut.merged.length === 0"
    class="flex items-center gap-2 text-body text-ink-muted"
  >
    <span class="i-mdi-check-circle-outline text-success-ink" aria-hidden="true" />
    {{ t("review_issues_none") }}
  </p>

  <div v-else class="flex flex-col gap-5">
    <!-- One group per sentence, folded to the sentence and how many files and rows it is about. -->
    <section v-if="leftOut.lines.length > 0" class="flex flex-col gap-2">
      <h3 class="text-subheading">{{ t("review_left_out_heading") }}</h3>
      <CollapsibleRoot v-for="(line, index) in leftOut.lines" :key="index" v-slot="{ open }" :class="group">
        <CollapsibleTrigger :class="groupTrigger">
          <span class="i-mdi-alert-outline shrink-0 text-warning-ink" aria-hidden="true" />
          <span class="flex-1 text-body">{{ dropSentence(line.drop) }}</span>
          <AppBadge :color="ColorIntent.WARNING">{{ line.files.length + line.rows.length }}</AppBadge>
          <span class="shrink-0 app-text-muted" :class="open ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'" />
        </CollapsibleTrigger>
        <CollapsibleContent class="flex flex-col items-start gap-1 px-3 pb-3">
          <FileChip v-for="file in line.files" :key="file" :name="file" />
          <div v-for="(source, rowIndex) in line.rows" :key="rowIndex" class="flex flex-wrap items-center gap-1.5">
            <FileChip :name="source.fileName" />
            <span class="text-body">{{ source.row.label }}</span>
          </div>
        </CollapsibleContent>
      </CollapsibleRoot>
    </section>

    <section v-if="leftOut.merged.length > 0" class="flex flex-col gap-2">
      <h3 class="text-subheading">{{ t("review_merged_heading") }}</h3>
      <CollapsibleRoot v-slot="{ open }" :class="group">
        <CollapsibleTrigger :class="groupTrigger">
          <span class="i-mdi-call-merge shrink-0 text-info-ink" aria-hidden="true" />
          <span class="flex-1 text-body">{{ t("review_merged_group") }}</span>
          <AppBadge :color="ColorIntent.INFO">{{ leftOut.merged.length }}</AppBadge>
          <span class="shrink-0 app-text-muted" :class="open ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'" />
        </CollapsibleTrigger>
        <CollapsibleContent class="flex flex-col items-start gap-1 px-3 pb-3">
          <div v-for="(entry, index) in leftOut.merged" :key="index" class="flex flex-wrap items-center gap-1.5">
            <span class="text-body">{{ entry.row.row.label }}</span>
            <FileChip :name="entry.row.fileName" />
            <FileChip v-for="(copy, copyIndex) in entry.alsoIn" :key="copyIndex" :name="copy.fileName" />
          </div>
        </CollapsibleContent>
      </CollapsibleRoot>
    </section>
  </div>
</template>
