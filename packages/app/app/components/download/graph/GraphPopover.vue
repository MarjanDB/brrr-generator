<script setup lang="ts">
import { useElementSize, useEventListener } from "@vueuse/core";
import { computed, useTemplateRef } from "vue";
import type { PlacedNode } from "~/download/graph/PlacedNode";
import { nodeLookOf } from "~/download/graph/view/nodeLook";
import type { PopoverContent } from "~/download/graph/view/PopoverContent";
import { PopoverKind } from "~/download/graph/view/PopoverKind";
import { popoverPosition } from "~/download/graph/view/popoverPosition";
import { formatNumber } from "~/download/labels/formatNumber";

const props = defineProps<{
	content: PopoverContent;
	anchor: PlacedNode;
	// How the graph is drawn on the canvas, so the popover can sit beside the scaled node.
	scale: number;
	shift: number;
	canvasWidth: number;
	canvasHeight: number;
	// The form the lines are for, as the footer names it.
	formName: string;
}>();

const { t, locale } = useI18n();

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

const look = computed(() => nodeLookOf(props.content.title));
const isRow = computed(() => props.content.kind === PopoverKind.ROW_ATTRIBUTES);
</script>

<template>
  <div
    ref="root"
    role="dialog"
    :aria-label="t(isRow ? 'download_popover_row_title' : 'download_popover_line_title')"
    :style="{ left: `${position.x}px`, top: `${position.y}px`, width: `${popoverWidth}px` }"
    class="absolute z-10 rounded-md border border-edge-strong bg-surface-raised p-3 text-sm text-ink shadow-md"
  >
    <div class="flex items-center gap-2 font-semibold mb-2">
      <span class="size-5.5 shrink-0 rounded-sm grid place-items-center" :class="look.tint">
        <span class="text-sm" :class="look.icon" aria-hidden="true" />
      </span>
      {{ t(isRow ? 'download_popover_row_title' : 'download_popover_line_title') }}
    </div>
    <dl class="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 max-h-64 overflow-auto tabular-nums">
      <template v-for="row in content.rows" :key="row.name">
        <dt class="text-ink-muted" :class="isRow ? 'font-mono text-xs' : ''">
          {{ row.nameKey === null ? row.name : t(row.nameKey) }}
        </dt>
        <dd :class="isRow ? 'font-mono text-xs break-all' : ''">
          {{ isRow ? row.value : formatNumber(row.value, locale) }}
        </dd>
      </template>
    </dl>
    <p class="mt-2 text-xs text-ink-muted">
      {{
        content.fromFile !== null
          ? t('download_popover_from_file', { file: content.fromFile })
          : t('download_popover_line_foot', { form: formName })
      }}
    </p>
  </div>
</template>
