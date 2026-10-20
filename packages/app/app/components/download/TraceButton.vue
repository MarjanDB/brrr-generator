<script setup lang="ts">
import { computed } from "vue";

// A row's button in the Trace column, which opens its item's trace. The column's header says what
// it does, so the button is its icon, named after the item for a screen reader and in its tooltip.
const props = defineProps<{ what: string }>();
const emit = defineEmits<{ trace: [] }>();
const { t } = useI18n();
const label = computed(() => t("download_trace_button_label", { what: props.what }));
</script>

<template>
  <AppTooltip :content="label" side="left">
    <AppButton ghost class="p-1" :aria-label="label" @click.stop="emit('trace')">
      <span class="i-mdi-graph-outline size-4.5" aria-hidden="true" />
    </AppButton>
  </AppTooltip>
</template>
