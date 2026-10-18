<script setup lang="ts">
import type { RowSourceKind } from "~/types/importSources";

defineProps<{
  subject: object;
  kind: RowSourceKind;
}>();

const { t } = useI18n();
</script>

<template>
  <!-- Portaled: the instrument dialog is translated and clips its overflow. -->
  <AppPopover align="end" :tooltip="t('review_source_button')" class="w-88">
    <template #trigger>
      <button type="button" class="button-ghost p-1" :aria-label="t('review_source_button')">
        <span class="i-mdi-file-find-outline block" />
      </button>
    </template>
    <RowSourcePopover :subject="subject" :kind="kind" />
  </AppPopover>
</template>
