<script setup lang="ts">
import { useElementSize, useEventListener } from "@vueuse/core";
import { computed, useTemplateRef } from "vue";
import type { GraphPopoverText } from "~/composables/useGraphText";
import { type GraphNode, GraphNodeKind, type PlacedNode } from "~/types/provenanceGraph";

const props = defineProps<{
	// The node it is about: its icon, and whether it is a broker row.
	node: GraphNode;
	content: GraphPopoverText;
	anchor: PlacedNode;
	// How the graph is drawn on the canvas, so the popover can sit beside the scaled node.
	scale: number;
	shift: number;
	canvasWidth: number;
	canvasHeight: number;
}>();

const popoverWidth = 260;
const rootRef = useTemplateRef<HTMLElement>("root");
const { height } = useElementSize(rootRef);

// A click inside the popover is not a click on the empty canvas behind it.
useEventListener(rootRef, "click", (event) => event.stopPropagation());

const position = computed(() =>
	popoverPosition({
		anchorX: props.anchor.x,
		anchorY: props.anchor.y,
		anchorWidth: props.anchor.width,
		popoverWidth,
		popoverHeight: height.value,
		canvasWidth: props.canvasWidth,
		canvasHeight: props.canvasHeight,
		scale: props.scale,
		shift: props.shift,
	}),
);

const look = computed(() => nodeLookOf(props.node));
const isRow = computed(() => props.node.kind === GraphNodeKind.ROW);
</script>

<template>
  <div
    ref="root"
    role="dialog"
    :aria-label="content.title"
    :style="{ left: `${position.x}px`, top: `${position.y}px`, width: `${popoverWidth}px` }"
    class="absolute z-10 rounded-md border border-edge-strong bg-surface-raised p-3 text-sm text-ink shadow-md"
  >
    <div class="flex items-center gap-2 font-semibold mb-2">
      <span class="size-5.5 shrink-0 rounded-sm grid place-items-center" :class="look.tint">
        <span class="text-sm" :class="look.icon" aria-hidden="true" />
      </span>
      {{ content.title }}
    </div>
    <dl class="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 max-h-64 overflow-auto tabular-nums">
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
