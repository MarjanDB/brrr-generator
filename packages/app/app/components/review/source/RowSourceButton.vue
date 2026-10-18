<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from "reka-ui";
import type { ImportSources } from "~/review/ImportSources";
import type { RowSourceKind } from "~/review/RowSourceKind";

defineProps<{
  sources: ImportSources;
  subject: object;
  kind: RowSourceKind;
}>();

const { t } = useI18n();
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <button
        type="button"
        class="button-ghost p-1"
        :aria-label="t('review_source_button')"
        :title="t('review_source_button')"
      >
        <span class="i-mdi-file-find-outline block" />
      </button>
    </PopoverTrigger>
    <!-- Portaled: the instrument dialog is translated and clips its overflow. -->
    <PopoverPortal>
      <PopoverContent
        side="bottom"
        align="end"
        :side-offset="6"
        :collision-padding="16"
        class="z-[60] w-[min(22rem,calc(100vw-2rem))] max-h-[min(28rem,70vh)] overflow-y-auto card p-3 shadow-lg"
      >
        <RowSourcePopover :sources="sources" :subject="subject" :kind="kind" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
