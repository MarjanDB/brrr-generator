<script setup lang="ts">
import type { ProvenanceWalker, ReportInstrumentKind } from "@brrr/lib";
import { useElementSize, useEventListener } from "@vueuse/core";
import { computed, useTemplateRef } from "vue";
import GraphEdges from "~/components/download/graph/GraphEdges.vue";
import GraphNodeCard from "~/components/download/graph/GraphNodeCard.vue";
import GraphPairCard from "~/components/download/graph/GraphPairCard.vue";
import GraphPopover from "~/components/download/graph/GraphPopover.vue";
import GraphStackCard from "~/components/download/graph/GraphStackCard.vue";
import AppPopover from "~/components/ui/AppPopover.vue";
import { CardState, type GraphChain, GraphLane, type GraphLayout, type GraphLayoutEdge, type GraphLayoutNode, type GraphNode, GraphNodeKind, type GraphPlacement, type PairSide } from "~/types/provenanceGraph";

const props = defineProps<{
	layout: GraphLayout;
	placement: GraphPlacement;
	lit: GraphChain | null;
	instrumentKind: ReportInstrumentKind;
	lotMatchingMethodKey: string;
	locale: string;
	// The open popover: the node it is about and the drawn node it hangs on; both null when none is open.
	popover: { node: GraphNode; anchor: GraphLayoutNode } | null;
	formName: string;
	walker: ProvenanceWalker;
}>();

const emit = defineEmits<{
	activateNode: [node: GraphLayoutNode];
	refocusNode: [node: GraphLayoutNode];
	activateLine: [node: GraphLayoutNode, side: PairSide];
	spread: [node: GraphLayoutNode];
	activateEdge: [edge: GraphLayoutEdge];
	clearLight: [];
	closePopover: [];
}>();

const { t } = useI18n();
const { popoverOf } = useGraphText();

// A wide graph shrinks to fit, but not below this: past it the canvas scrolls sideways.
const minimumScale = 0.6;

const wrapperRef = useTemplateRef<HTMLElement>("wrapper");
const { width: wrapperWidth } = useElementSize(wrapperRef);

// A click on empty canvas lets go of the lit chain. Cards and edges stop their clicks.
useEventListener(wrapperRef, "click", () => emit("clearLight"));

const scale = computed(() =>
	wrapperWidth.value === 0
		? 1
		: Math.min(1, Math.max(minimumScale, wrapperWidth.value / props.placement.width)),
);
const shift = computed(() =>
	Math.max(0, (wrapperWidth.value - props.placement.width * scale.value) / 2),
);
const height = computed(() => props.placement.height * scale.value);

function stateOf(node: GraphLayoutNode): CardState {
	if (props.lit !== null && !props.lit.nodes.has(node)) {
		return CardState.DIMMED;
	}
	if (node === props.layout.focus) {
		return CardState.FOCUS;
	}
	return props.lit !== null && !node.isStub ? CardState.LIT : CardState.NORMAL;
}

// The drawn card the popover hangs on; each card carries its node's key.
const anchorElement = computed(() => {
	if (props.popover === null) {
		return null;
	}
	const key = CSS.escape(props.popover.anchor.node.key);
	return wrapperRef.value?.querySelector<HTMLElement>(`[data-node-key="${key}"]`) ?? null;
});
const popoverText = computed(() =>
	props.popover === null ? null : popoverOf(props.popover.node, props.walker, props.formName),
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
          @activate="emit('activateNode', placed.layoutNode)"
          @refocus="emit('refocusNode', placed.layoutNode)"
        />
      </template>
    </div>

    <!-- A click outside closes the popover and keeps the chain lit; Escape lets go of both. -->
    <AppPopover
      v-if="popover !== null && popoverText !== null && anchorElement !== null"
      :open="true"
      :reference="anchorElement"
      side="right"
      :aria-label="popoverText.title"
      class="w-65"
      @update:open="(open) => open || emit('closePopover')"
      @escape-key-down="emit('clearLight')"
    >
      <GraphPopover :node="popover.node" :content="popoverText" />
    </AppPopover>
  </div>
</template>
