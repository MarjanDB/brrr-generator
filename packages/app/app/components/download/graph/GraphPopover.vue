<script setup lang="ts">
import { computed } from "vue";
import type { GraphPopoverText } from "~/composables/useGraphText";
import { type GraphNode, GraphNodeKind } from "~/types/provenanceGraph";

const props = defineProps<{
	// The node it is about: its icon, and whether it is a broker row.
	node: GraphNode;
	content: GraphPopoverText;
}>();

const look = computed(() => nodeLookOf(props.node));
const isRow = computed(() => props.node.kind === GraphNodeKind.ROW);
</script>

<template>
  <div class="text-sm text-ink">
    <div class="flex items-center gap-2 font-semibold mb-2">
      <span class="size-5.5 shrink-0 rounded-sm grid place-items-center" :class="look.tint">
        <span class="text-sm" :class="look.icon" aria-hidden="true" />
      </span>
      {{ content.title }}
    </div>
    <dl class="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 tabular-nums">
      <template v-for="row in content.rows" :key="row.name">
        <dt class="text-ink-muted" :class="isRow ? 'font-mono text-xs' : ''">
          {{ row.name }}
        </dt>
        <dd :class="isRow ? 'font-mono text-xs break-all' : ''">
          {{ row.value }}
        </dd>
      </template>
    </dl>
    <p class="mt-2 text-xs text-ink-muted">
      {{ content.foot }}
    </p>
  </div>
</template>
