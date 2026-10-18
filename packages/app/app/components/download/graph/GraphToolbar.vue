<script setup lang="ts">
import GraphCaption from "~/components/download/graph/GraphCaption.vue";
import AppButton from "~/components/ui/AppButton.vue";
import AppTooltip from "~/components/ui/AppTooltip.vue";
import type { CaptionSegment } from "~/download/graph/CaptionSegment";
import type { CaptionContext } from "~/download/graph/view/captionTextOf";

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
      class="button-ghost size-8 shrink-0"
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
      <button
        type="button"
        :aria-pressed="showEveryStep"
        class="shrink-0 rounded-md border px-2.5 py-1 text-sm transition-colors"
        :class="
          showEveryStep
            ? 'border-action-edge bg-action-soft text-action-ink'
            : 'border-edge-strong bg-surface-raised text-ink hover:bg-surface-hover'
        "
        @click="emit('toggleEveryStep')"
      >
        {{ t('download_graph_every_step') }}
      </button>
    </AppTooltip>
  </div>
</template>
