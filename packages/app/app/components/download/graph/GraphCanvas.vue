<script setup lang="ts">
import type { ReportInstrumentKind } from "@brrr/lib";
import { useElementSize, useEventListener } from "@vueuse/core";
import { computed, useTemplateRef } from "vue";
import GraphEdges from "~/components/download/graph/GraphEdges.vue";
import GraphNodeCard from "~/components/download/graph/GraphNodeCard.vue";
import GraphPairCard from "~/components/download/graph/GraphPairCard.vue";
import GraphPopover from "~/components/download/graph/GraphPopover.vue";
import GraphStackCard from "~/components/download/graph/GraphStackCard.vue";
import type { GraphChain } from "~/download/graph/GraphChain";
import { GraphLane } from "~/download/graph/GraphLane";
import type { GraphLayout } from "~/download/graph/GraphLayout";
import type { GraphLayoutEdge } from "~/download/graph/GraphLayoutEdge";
import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";
import { defaultGraphMetrics } from "~/download/graph/GraphMetrics";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import type { GraphPlacement } from "~/download/graph/GraphPlacement";
import { CardState } from "~/download/graph/view/CardState";
import { headingKeys, laneLabelKeys } from "~/download/graph/view/headingKeys";
import type { PairSide } from "~/download/graph/view/PairSide";
import type { PopoverContent } from "~/download/graph/view/PopoverContent";

const props = defineProps<{
	layout: GraphLayout;
	placement: GraphPlacement;
	lit: GraphChain | null;
	instrumentKind: ReportInstrumentKind;
	lotMatchingMethodKey: string;
	locale: string;
	// The open popover and the node it hangs on; both null when none is open.
	popover: PopoverContent | null;
	popoverAnchor: GraphLayoutNode | null;
	formName: string;
}>();

const emit = defineEmits<{
	activateNode: [node: GraphLayoutNode];
	refocusNode: [node: GraphLayoutNode];
	activateLine: [node: GraphLayoutNode, side: PairSide];
	spread: [node: GraphLayoutNode];
	activateEdge: [edge: GraphLayoutEdge];
	clearLight: [];
}>();

const { t } = useI18n();

// A wide graph shrinks to fit, but not below this: past it the canvas scrolls sideways.
const minimumScale = 0.6;
// Room for the popover below a short graph.
const minimumHeight = 280;

const wrapperRef = useTemplateRef<HTMLElement>("wrapper");
const { width: wrapperWidth, height: wrapperHeight } = useElementSize(wrapperRef);

// A click on empty canvas lets go of the lit chain. Cards, edges and the popover stop their clicks.
useEventListener(wrapperRef, "click", () => emit("clearLight"));

const scale = computed(() =>
	wrapperWidth.value === 0
		? 1
		: Math.min(1, Math.max(minimumScale, wrapperWidth.value / props.placement.width)),
);
const shift = computed(() =>
	Math.max(0, (wrapperWidth.value - props.placement.width * scale.value) / 2),
);
const height = computed(() => Math.max(minimumHeight, props.placement.height * scale.value));

function stateOf(node: GraphLayoutNode): CardState {
	if (props.lit !== null && !props.lit.nodes.has(node)) {
		return CardState.DIMMED;
	}
	if (node === props.layout.focus) {
		return CardState.FOCUS;
	}
	return props.lit !== null && !node.isStub ? CardState.LIT : CardState.NORMAL;
}

const anchor = computed(() =>
	props.popoverAnchor === null ? null : props.placement.placedNodeOf(props.popoverAnchor),
);

// UnoCSS only sees class strings written out in full: a band is tinted by what its lane holds.
const bandClasses: Record<GraphLane, string> = {
	[GraphLane.ACQUIRED]: "bg-success-soft/40",
	[GraphLane.MIDDLE]: "bg-transparent",
	[GraphLane.SOLD]: "bg-danger-soft/40",
};

function bandLabel(lane: GraphLane): string {
	const keys = laneLabelKeys(props.instrumentKind);
	switch (lane) {
		case GraphLane.ACQUIRED:
			return t(keys.acquired);
		case GraphLane.SOLD:
			return t(keys.sold);
		case GraphLane.MIDDLE:
			return "";
	}
}

const headings = computed(() =>
	props.placement.headings.map((heading) => ({
		x: heading.x,
		text: heading.column.headings.map((name) => t(headingKeys[name])).join(" · "),
	})),
);
</script>

<template>
  <div
    ref="wrapper"
    class="relative overflow-x-auto overflow-y-hidden"
    :style="{ height: `${height}px` }"
  >
    <div
      class="absolute left-0 top-0 origin-top-left"
      :style="{
        width: `${placement.width}px`,
        height: `${placement.height}px`,
        transform: `translateX(${shift}px) scale(${scale})`,
      }"
    >
      <div
        v-for="band in placement.bands"
        :key="band.lane"
        class="absolute left-0 rounded-md"
        :class="bandClasses[band.lane]"
        :style="{ top: `${band.y - 6}px`, height: `${band.height + 12}px`, width: `${placement.width}px` }"
      >
        <span class="absolute left-2 top-1 text-xs font-medium text-ink-muted">{{ bandLabel(band.lane) }}</span>
      </div>

      <span
        v-for="heading in headings"
        :key="heading.x"
        class="absolute top-1 text-xs font-medium text-ink-muted truncate"
        :style="{ left: `${heading.x}px`, width: `${defaultGraphMetrics.nodeWidth}px` }"
      >
        {{ heading.text }}
      </span>

      <GraphEdges
        :placement="placement"
        :lit="lit"
        :locale="locale"
        @activate-edge="(edge) => emit('activateEdge', edge)"
      />

      <template v-for="placed in placement.nodes" :key="placed.layoutNode.node.key">
        <GraphStackCard
          v-if="placed.layoutNode.node.kind === GraphNodeKind.STACK"
          :placed="placed"
          :state="stateOf(placed.layoutNode)"
          :locale="locale"
          @spread="emit('spread', placed.layoutNode)"
        />
        <GraphPairCard
          v-else-if="placed.layoutNode.node.kind === GraphNodeKind.PAIR"
          :placed="placed"
          :state="stateOf(placed.layoutNode)"
          :lot-matching-method-key="lotMatchingMethodKey"
          :locale="locale"
          @activate-line="(side) => emit('activateLine', placed.layoutNode, side)"
          @refocus="emit('refocusNode', placed.layoutNode)"
        />
        <GraphNodeCard
          v-else
          :placed="placed"
          :state="stateOf(placed.layoutNode)"
          :locale="locale"
          @activate="emit('activateNode', placed.layoutNode)"
          @refocus="emit('refocusNode', placed.layoutNode)"
        />
      </template>
    </div>

    <GraphPopover
      v-if="popover !== null && anchor !== null"
      :content="popover"
      :anchor="anchor"
      :scale="scale"
      :shift="shift"
      :canvas-width="wrapperWidth"
      :canvas-height="wrapperHeight"
      :form-name="formName"
    />
  </div>
</template>
