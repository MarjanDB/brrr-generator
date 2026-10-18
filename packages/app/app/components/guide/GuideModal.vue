<script setup lang="ts">
import AppDialog from "~/components/ui/AppDialog.vue";
import type { GuideStep, LinkSegment, Segment } from "~/types/guide";

defineProps<{
  nameKey: string;
  taglineKey?: string;
  iconUrl?: string;
  steps: GuideStep[];
}>();

// Opened by the trigger slot, or by code through v-model:open.
const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();

function isLink(segment: Segment): segment is LinkSegment {
  return segment.type === "link";
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    :title="t(nameKey)"
    :description="taglineKey === undefined ? undefined : t(taglineKey)"
  >
    <template v-if="$slots.trigger" #trigger>
      <slot name="trigger" />
    </template>
    <template v-if="iconUrl" #icon>
      <img :src="iconUrl" :alt="t(nameKey)" class="h-6 w-6 shrink-0" />
    </template>

    <div
      v-for="(step, index) in steps"
      :key="index"
      class="flex gap-4 pb-6 last:pb-0"
    >
      <!-- Step number + connecting line -->
      <div class="flex flex-col items-center shrink-0">
        <div class="w-7 h-7 rounded-full app-surface-sunken border app-border-strong flex items-center justify-center shrink-0">
          <span class="block text-xs font-semibold app-text-muted">{{ index + 1 }}</span>
        </div>
        <div v-if="index < steps.length - 1" class="w-px flex-1 mt-2 app-border-strong border-l border-dashed" />
      </div>

      <!-- Step content -->
      <div class="flex flex-col gap-2 pt-0.5 min-w-0 pb-2">
        <span class="text-label">{{ t(step.titleKey) }}</span>
        <p class="text-body-sm app-text-muted leading-relaxed">
          <template v-for="(segment, si) in step.segments" :key="si">
            <a
              v-if="isLink(segment)"
              :href="segment.url"
              target="_blank"
              rel="noopener"
              class="text-action-ink hover:underline inline-flex items-center gap-0.5"
            >{{ t(segment.textKey) }}<span class="i-mdi-open-in-new text-xs ml-0.5" /></a>
            <template v-else>{{ t(segment.textKey) }}</template>
          </template>
        </p>
        <div v-if="step.imageUrls && step.imageUrls.length > 0" class="flex flex-col gap-2 mt-1">
          <img
            v-for="(url, ii) in step.imageUrls"
            :key="ii"
            :src="url"
            :alt="t(step.titleKey)"
            class="rounded border app-border max-w-full"
          />
        </div>
      </div>
    </div>
  </AppDialog>
</template>
