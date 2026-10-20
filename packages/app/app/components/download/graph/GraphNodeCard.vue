<script setup lang="ts">
import { computed } from "vue";
import { CardState, GraphDirection, GraphNodeKind, type PlacedNode } from "~/types/provenanceGraph";

const props = defineProps<{
	placed: PlacedNode;
	state: CardState;
}>();

const emit = defineEmits<{
	click: [];
}>();

const { t } = useI18n();
const { warningSentence } = useProvenanceText();
const { nodeText } = useGraphText();

const node = computed(() => props.placed.layoutNode.node);
const isStub = computed(() => props.placed.layoutNode.isStub);
const look = computed(() => nodeLookOf(node.value));

// What the node says: a left-out node its sentence, anything else its value.
const text = computed(() => nodeText(node.value));

const warnings = computed(() =>
	node.value.warnings.map((warning) => warningSentence(warning)),
);

// Files and rows say the broker's own words; a card a click follows says so.
const title = computed(() => {
	const base =
		node.value.kind === GraphNodeKind.FILE || node.value.kind === GraphNodeKind.ROW
			? (node.value.source?.label ?? text.value)
			: text.value;
	const followable = props.placed.layoutNode.follow !== null;
	return [followable ? t("download_graph_follow", { value: base }) : base, ...warnings.value].join(
		"\n",
	);
});

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
  <AppTooltip :content="title">
    <button
      type="button"
      :data-node-key="placed.layoutNode.node.key"
      :style="{
        left: `${placed.x}px`,
        top: `${placed.y}px`,
        width: `${placed.width}px`,
        height: `${placed.height}px`,
      }"
      class="absolute flex items-center gap-2 rounded-md border border-edge-strong bg-surface-raised px-1.5 text-left text-sm text-ink cursor-pointer transition-[opacity,background-color] hover:bg-surface-hover active:bg-surface app-focus-ring"
      :class="classes"
      @click.stop="emit('click')"
    >
      <NodeIcon :look="look" :small="false" />
      <span class="min-w-0 flex-1 truncate tabular-nums">{{ text }}</span>
      <span
        v-if="warnings.length > 0"
        class="i-mdi-alert shrink-0 text-warning-ink"
        aria-hidden="true"
      />
      <span
        v-if="placed.layoutNode.hasMore"
        class="absolute top-1.5 text-ink-muted"
        :class="placed.layoutNode.direction === GraphDirection.UP ? '-left-4' : '-right-4'"
        aria-hidden="true"
      >
        ⋯
      </span>
    </button>
  </AppTooltip>
</template>
