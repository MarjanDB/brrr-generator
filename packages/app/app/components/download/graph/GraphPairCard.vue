<script setup lang="ts">
import { ProvenanceField, type ProvenanceNode } from "@brrr/lib";
import { computed } from "vue";
import { GraphLayouts } from "~/composables/provenanceGraph/graphLayouts";
import { CardState, PairSide, type PlacedNode } from "~/types/provenanceGraph";

const props = defineProps<{
	placed: PlacedNode;
	state: CardState;
	lotMatchingMethodKey: string;
	locale: string;
}>();

const emit = defineEmits<{
	clickLine: [side: PairSide];
}>();

const { t } = useI18n();
const { reportLineText } = useGraphText();

const pair = computed(() => props.placed.layoutNode.node.pair);
const isStub = computed(() => props.placed.layoutNode.isStub);
// A lot a click follows says so.
const hint = computed(() =>
	props.placed.layoutNode.follow === null
		? t("download_graph_pair_hint")
		: t("download_graph_follow", { value: t("download_graph_pair_hint") }),
);

const quantity = computed(() => {
	const lotQuantity = pair.value === null ? null : fieldOf(pair.value.lot, ProvenanceField.QUANTITY);
	return lotQuantity === null ? "" : formatNumber(lotQuantity, props.locale);
});

// A side whose line was left out has nothing to say.
function lineText(line: ProvenanceNode | null | undefined): string {
	return line === null || line === undefined
		? "—"
		: reportLineText(line);
}

const acquiredText = computed(() => lineText(pair.value?.acquired.line));
const soldText = computed(() => lineText(pair.value?.sold.line));

// UnoCSS only sees class strings written out in full.
const stateClasses: Record<CardState, string> = {
	[CardState.NORMAL]: "",
	[CardState.FOCUS]: "ring-2 ring-accent-edge",
	[CardState.LIT]: "ring-2 ring-action-edge",
	[CardState.DIMMED]: "opacity-15",
};

const classes = computed(() => [
	stateClasses[props.state],
	isStub.value && props.state !== CardState.DIMMED ? "opacity-60 border-dashed" : "",
]);
</script>

<template>
  <div
    :data-node-key="placed.layoutNode.node.key"
    :style="{
      left: `${placed.x}px`,
      top: `${placed.y}px`,
      width: `${placed.width}px`,
      height: `${placed.height}px`,
    }"
    class="absolute flex flex-col overflow-hidden rounded-md border border-edge-strong bg-surface-raised text-sm text-ink transition-opacity"
    :class="classes"
  >
    <AppTooltip :content="hint">
      <div
        class="flex items-center gap-1.5 px-2 bg-action-soft text-action-ink text-xs shrink-0"
        :style="{ height: `${GraphLayouts.defaultMetrics.pairHeaderHeight}px` }"
      >
        <span class="i-mdi-link-variant" aria-hidden="true" />
        <span class="tabular-nums">{{ quantity }}</span>
        <span class="ml-auto">{{ t(lotMatchingMethodKey) }}</span>
      </div>
    </AppTooltip>
    <button
      type="button"
      class="flex flex-1 items-center gap-2 px-2 text-left tabular-nums border-t border-edge-subtle cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface app-focus-ring-inset"
      @click.stop="emit('clickLine', PairSide.ACQUIRED)"
    >
      <NodeIcon :look="acquiredLook" :small="true" />
      <span class="truncate">{{ acquiredText }}</span>
    </button>
    <button
      type="button"
      class="flex flex-1 items-center gap-2 px-2 text-left tabular-nums border-t border-edge-subtle cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface app-focus-ring-inset"
      @click.stop="emit('clickLine', PairSide.SOLD)"
    >
      <NodeIcon :look="soldLook" :small="true" />
      <span class="truncate">{{ soldText }}</span>
    </button>
  </div>
</template>
