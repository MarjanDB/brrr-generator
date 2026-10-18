<script setup lang="ts">
import { Toggle } from "reka-ui";
import GraphCaption from "~/components/download/graph/GraphCaption.vue";
import AppButton from "~/components/ui/AppButton.vue";
import AppTooltip from "~/components/ui/AppTooltip.vue";
import type { CaptionContext } from "~/composables/useGraphText";
import type { CaptionSegment } from "~/types/provenanceGraph";

defineProps<{
	segments: CaptionSegment[];
	context: CaptionContext;
	canGoBack: boolean;
	showEveryStep: boolean;
}>();

const emit = defineEmits<{
	back: [];
	toggleEveryStep: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-2 border-b border-edge-subtle">
    <AppButton
      ghost
      class="size-8 shrink-0"
      :disabled="!canGoBack"
      :aria-label="t('download_graph_back')"
      @click="emit('back')"
    >
      <span class="i-mdi-arrow-left" aria-hidden="true" />
    </AppButton>
    <div class="min-w-0 flex-1">
      <GraphCaption :segments="segments" :context="context" />
    </div>
    <AppTooltip :content="t('download_graph_every_step_hint')">
      <!-- Styled by aria-pressed: the tooltip around it sets data-state to its own state. -->
      <Toggle
        :model-value="showEveryStep"
        class="shrink-0 rounded-md border px-2.5 py-1 text-sm transition-colors border-edge-strong bg-surface-raised text-ink hover:bg-surface-hover aria-pressed:border-action-edge aria-pressed:bg-action-soft aria-pressed:text-action-ink"
        @update:model-value="emit('toggleEveryStep')"
      >
        {{ t('download_graph_every_step') }}
      </Toggle>
    </AppTooltip>
  </div>
</template>
