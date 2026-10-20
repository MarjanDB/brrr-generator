<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from "reka-ui";
import type { RowSourceKind } from "~/types/importSources";

// Mounted only while the popover is open, so a long table walks the graph only for the row asked about.
const props = defineProps<{
  subject: object;
  kind: RowSourceKind;
}>();

const { t } = useI18n();
const sources = useImportSources();

const rows = computed(() => sources.of(props.subject));
const keys = computed(() => sources.keyAttributesOf(rows.value.row.row, props.kind));
const all = computed(() => sources.allAttributesOf(rows.value.row.row));
</script>

<template>
  <div class="flex flex-col gap-3">
    <h4 class="text-label">{{ t("review_source_title") }}</h4>

    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-meta">{{ t("review_source_from") }}</span>
      <FileChip :name="rows.row.fileName" />
      <FileChip v-for="(copy, index) in rows.alsoIn" :key="index" :name="copy.fileName" />
    </div>

    <p v-if="rows.alsoIn.length > 0" class="flex items-start gap-1.5 text-xs text-info-ink">
      <span class="i-mdi-call-merge mt-0.5 shrink-0" />
      <span>{{ t("review_source_merged") }}</span>
    </p>

    <dl v-if="keys.length > 0" class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      <template v-for="attribute in keys" :key="attribute.name">
        <dt class="text-xs text-ink-muted">{{ attribute.name }}</dt>
        <dd class="text-xs break-all">{{ attribute.value === "" ? "—" : attribute.value }}</dd>
      </template>
    </dl>

    <CollapsibleRoot :default-open="keys.length === 0" class="flex flex-col gap-2">
      <CollapsibleTrigger class="button-quiet control-sm self-start px-2">
        <span class="i-mdi-chevron-down" />
        {{ t("review_source_all_attributes", { n: all.length }) }}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <template v-for="attribute in all" :key="attribute.name">
            <dt class="text-xs text-ink-muted">{{ attribute.name }}</dt>
            <dd class="text-xs break-all">{{ attribute.value === "" ? "—" : attribute.value }}</dd>
          </template>
        </dl>
      </CollapsibleContent>
    </CollapsibleRoot>
  </div>
</template>
