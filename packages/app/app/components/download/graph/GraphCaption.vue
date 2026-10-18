<script setup lang="ts">
import { computed } from "vue";
import { captionSentence } from "~/download/graph/view/captionSentence";
import { type CaptionContext, captionTextOf } from "~/download/graph/view/captionTextOf";
import type { CaptionSegment } from "~/types/provenanceGraph";

const props = defineProps<{
	segments: CaptionSegment[];
	context: CaptionContext;
}>();

const { t } = useI18n();
const { dropSentence } = useProvenanceText();

// All text is written at render, so switching language redraws it.
const parts = computed(() =>
	props.segments.map((segment) => {
		const text = captionTextOf(segment, props.context);
		return {
			sentence: captionSentence(text, (key, params) => t(key, params), dropSentence),
			look: text.node === null ? null : nodeLookOf(text.node.node),
		};
	}),
);
</script>

<template>
  <ol class="flex min-w-0 flex-wrap items-center gap-1 text-sm text-ink" aria-live="polite">
    <li v-for="(part, index) in parts" :key="index" class="flex items-center gap-1">
      <span v-if="index > 0" class="i-mdi-chevron-right text-ink-muted" aria-hidden="true" />
      <span
        v-if="part.look !== null"
        class="size-5 shrink-0 rounded-sm grid place-items-center"
        :class="part.look.tint"
      >
        <span class="text-xs" :class="part.look.icon" aria-hidden="true" />
      </span>
      <span>{{ part.sentence }}</span>
    </li>
  </ol>
</template>
