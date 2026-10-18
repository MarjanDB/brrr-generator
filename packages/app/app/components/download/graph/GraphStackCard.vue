<script setup lang="ts">
import { computed } from "vue";
import type { PlacedNode } from "~/download/graph/PlacedNode";
import { CardState } from "~/download/graph/view/CardState";
import { nodeLookOf } from "~/download/graph/view/nodeLook";
import { nodeTextOf, nodeValueOf } from "~/download/graph/view/nodeValueOf";

const props = defineProps<{
	placed: PlacedNode;
	state: CardState;
	locale: string;
}>();

const emit = defineEmits<{
	spread: [];
}>();

const { t } = useI18n();

const node = computed(() => props.placed.layoutNode.node);
const look = computed(() => nodeLookOf(node.value));
const text = computed(() => nodeTextOf(nodeValueOf(node.value, props.locale), (key, params) => t(key, params)));

// UnoCSS only sees class strings written out in full.
const stateClasses: Record<CardState, string> = {
	[CardState.NORMAL]: "",
	[CardState.FOCUS]: "ring-2 ring-accent-edge",
	[CardState.LIT]: "ring-2 ring-action-edge",
	[CardState.DIMMED]: "opacity-15",
};
</script>

<template>
  <button
    type="button"
    :title="t('download_graph_spread')"
    :style="{
      left: `${placed.x}px`,
      top: `${placed.y}px`,
      width: `${placed.width}px`,
      height: `${placed.height}px`,
    }"
    class="absolute isolate text-left text-sm text-ink transition-opacity"
    :class="stateClasses[state]"
    @click.stop="emit('spread')"
  >
    <span class="absolute inset-0 translate-x-2 translate-y-2 -z-20 rounded-md border border-edge bg-surface-raised" />
    <span class="absolute inset-0 translate-x-1 translate-y-1 -z-10 rounded-md border border-edge-strong bg-surface-raised" />
    <span class="absolute inset-0 flex items-center gap-2 rounded-md border border-edge-strong bg-surface-raised px-1.5">
      <span class="size-6 shrink-0 rounded-sm grid place-items-center" :class="look.tint">
        <span class="text-sm" :class="look.icon" aria-hidden="true" />
      </span>
      <span class="min-w-0 flex-1 truncate tabular-nums">{{ text }}</span>
    </span>
  </button>
</template>
