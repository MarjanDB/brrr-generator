<script setup lang="ts">
import { computed } from "vue";
import type { CaptionContext } from "~/composables/useGraphText";
import type { CaptionSegment } from "~/types/provenanceGraph";

const props = defineProps<{
	segments: CaptionSegment[];
	context: CaptionContext;
}>();

const { captionText } = useGraphText();

// All text is written at render, so switching language redraws it.
const parts = computed(() =>
	props.segments.map((segment) => ({
		sentence: captionText(segment, props.context),
		look: segment.node === null ? null : NodeLooks.of(segment.node.node),
	})),
);
</script>

<template>
  <ol class="flex min-w-0 flex-wrap items-center gap-1 text-sm text-ink" aria-live="polite">
    <li v-for="(part, index) in parts" :key="index" class="flex items-center gap-1">
      <span v-if="index > 0" class="i-mdi-chevron-right text-ink-muted" aria-hidden="true" />
      <NodeIcon v-if="part.look !== null" :look="part.look" :small="true" />
      <span>{{ part.sentence }}</span>
    </li>
  </ol>
</template>
