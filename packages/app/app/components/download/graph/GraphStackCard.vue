<script setup lang="ts">
import { computed } from "vue";
import { CardState, type PlacedNode } from "~/types/provenanceGraph";

const props = defineProps<{
	placed: PlacedNode;
	state: CardState;
}>();

const emit = defineEmits<{
	spread: [];
}>();

const { t } = useI18n();
const { nodeText } = useGraphText();

const node = computed(() => props.placed.layoutNode.node);
const look = computed(() => NodeLooks.of(node.value));
const text = computed(() => nodeText(node.value));

// UnoCSS only sees class strings written out in full.
const stateClasses: Record<CardState, string> = {
	[CardState.NORMAL]: "",
	[CardState.FOCUS]: "ring-2 ring-accent-edge",
	[CardState.LIT]: "ring-2 ring-action-edge",
	[CardState.DIMMED]: "opacity-15",
};
</script>

<template>
  <AppTooltip :content="t('download_graph_spread')">
    <button
      type="button"
      :data-node-key="placed.layoutNode.node.key"
      :style="{
        left: `${placed.x}px`,
        top: `${placed.y}px`,
        width: `${placed.width}px`,
        height: `${placed.height}px`,
      }"
      class="group absolute isolate text-left text-sm text-ink cursor-pointer transition-opacity app-focus-ring"
      :class="stateClasses[state]"
      @click.stop="emit('spread')"
    >
      <span class="absolute inset-0 translate-x-2 translate-y-2 -z-20 rounded-md border border-edge bg-surface-raised" />
      <span class="absolute inset-0 translate-x-1 translate-y-1 -z-10 rounded-md border border-edge-strong bg-surface-raised" />
      <span class="absolute inset-0 flex items-center gap-2 rounded-md border border-edge-strong bg-surface-raised px-1.5 transition-colors group-hover:bg-surface-hover group-active:bg-surface">
        <NodeIcon :look="look" :small="false" />
        <span class="min-w-0 flex-1 truncate tabular-nums">{{ text }}</span>
      </span>
    </button>
  </AppTooltip>
</template>
