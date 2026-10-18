<script setup lang="ts">
import GraphSplitBadge from "~/components/download/graph/GraphSplitBadge.vue";
import { CardState, type GraphChain, type GraphLayoutEdge, type GraphPlacement, type PlacedEdge } from "~/types/provenanceGraph";

const props = defineProps<{
	placement: GraphPlacement;
	lit: GraphChain | null;
	locale: string;
}>();

const emit = defineEmits<{
	activateEdge: [edge: GraphLayoutEdge];
}>();

// Off the lit chain while one is lit.
function isDimmed(placed: PlacedEdge): boolean {
	return props.lit !== null && !props.lit.edges.has(placed.edge);
}

function isLit(placed: PlacedEdge): boolean {
	return props.lit?.edges.has(placed.edge) ?? false;
}

const stubDash = "4 4";
</script>

<template>
  <svg
    class="absolute left-0 top-0 overflow-visible"
    :width="placement.width"
    :height="placement.height"
    aria-hidden="true"
  >
    <template v-for="(placed, index) in placement.edges" :key="index">
      <path
        :d="placed.path"
        fill="none"
        stroke-linecap="round"
        class="transition-opacity"
        :class="[
          placed.edge.isStub ? 'stroke-edge-strong' : 'stroke-action-edge',
          isDimmed(placed) ? 'opacity-15' : '',
        ]"
        :stroke-width="placed.edge.isStub ? 1.2 : isLit(placed) ? 2.4 : 1.7"
        :stroke-dasharray="placed.edge.isStub ? stubDash : undefined"
      />
      <!-- biome-ignore lint/a11y/noStaticElementInteractions: an edge's hit area is for the pointer; the chain it lights is reachable from the nodes, which are buttons -->
      <path
        v-if="!placed.edge.isStub"
        :d="placed.path"
        fill="none"
        stroke-width="12"
        class="stroke-transparent cursor-pointer"
        @click.stop="emit('activateEdge', placed.edge)"
      />
    </template>
  </svg>
  <template v-for="(placed, index) in placement.edges" :key="`badge-${index}`">
    <GraphSplitBadge
      v-if="placed.edge.split !== null && placed.badge !== null"
      :factor="placed.edge.split"
      :x="placed.badge.x"
      :y="placed.badge.y"
      :state="isDimmed(placed) ? CardState.DIMMED : CardState.NORMAL"
      :locale="locale"
    />
  </template>
</template>
