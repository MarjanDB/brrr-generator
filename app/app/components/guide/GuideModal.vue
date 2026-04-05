<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import type { GuideStep, LinkSegment, Segment } from "~/components/guide/guideTypes";

defineProps<{
  nameKey: string;
  taglineKey?: string;
  iconUrl?: string;
  steps: GuideStep[];
}>();

const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();

function isLink(segment: Segment): segment is LinkSegment {
  return segment.type === "link";
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 app-overlay" />
      <DialogContent
        class="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,640px)] max-h-[85vh] flex flex-col app-surface-overlay border app-border-strong rounded-lg shadow-xl overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 px-5 py-4 border-b app-border shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <img
              v-if="iconUrl"
              :src="iconUrl"
              :alt="t(nameKey)"
              class="h-6 w-6 shrink-0"
            />
            <div class="flex flex-col gap-0.5 min-w-0">
              <DialogTitle class="text-h5">{{ t(nameKey) }}</DialogTitle>
              <span v-if="taglineKey" class="text-caption app-text-muted">{{ t(taglineKey) }}</span>
            </div>
          </div>
          <DialogClose class="button-ghost shrink-0 p-1">
            <span class="i-mdi-close text-lg block" />
          </DialogClose>
        </div>

        <!-- Scrollable body -->
        <div class="overflow-y-auto flex flex-col gap-0 px-5 py-4">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="flex gap-4 pb-6 last:pb-0"
          >
            <!-- Step number + connecting line -->
            <div class="flex flex-col items-center shrink-0">
              <div class="w-7 h-7 rounded-full app-surface-sunken border app-border-strong flex items-center justify-center shrink-0">
                <span class="text-xs font-semibold app-text-muted">{{ index + 1 }}</span>
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
                    class="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-0.5"
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
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
