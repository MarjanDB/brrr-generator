<script setup lang="ts">
import { computed } from "vue";
import { GraphDirection } from "~/download/graph/GraphDirection";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import type { PlacedNode } from "~/download/graph/PlacedNode";
import { CardState } from "~/download/graph/view/CardState";
import { nodeLookOf } from "~/download/graph/view/nodeLook";
import { nodeTextOf, nodeValueOf } from "~/download/graph/view/nodeValueOf";
import { dropSentence } from "~/download/sentences/dropSentence";
import { warningSentence } from "~/download/sentences/warningSentence";

const props = defineProps<{
	placed: PlacedNode;
	state: CardState;
	locale: string;
}>();

const emit = defineEmits<{
	activate: [];
	refocus: [];
}>();

const { t } = useI18n();
const { translate, format } = useSentences();

const node = computed(() => props.placed.layoutNode.node);
const isStub = computed(() => props.placed.layoutNode.isStub);
const look = computed(() => nodeLookOf(node.value));

// What the node says: a left-out node its sentence, anything else its value.
const text = computed(() =>
	node.value.drop !== null
		? dropSentence(node.value.drop, translate, format)
		: nodeTextOf(nodeValueOf(node.value, props.locale), translate),
);

const warnings = computed(() =>
	node.value.warnings.map((warning) => warningSentence(warning, translate, format)),
);

// Files and rows say the broker's own words; a stub says it can be followed.
const title = computed(() => {
	const base =
		node.value.kind === GraphNodeKind.FILE || node.value.kind === GraphNodeKind.ROW
			? (node.value.source?.label ?? text.value)
			: text.value;
	const followable = isStub.value && node.value.kind !== GraphNodeKind.DROP;
	return [followable ? t("download_graph_follow", { value: base }) : base, ...warnings.value].join(
		"\n",
	);
});

// A stub is followed with a click. A left-out node is never followed.
function onClick() {
	if (isStub.value && node.value.kind !== GraphNodeKind.DROP) {
		emit("refocus");
	} else {
		emit("activate");
	}
}

function onDoubleClick() {
	if (node.value.kind !== GraphNodeKind.DROP) {
		emit("refocus");
	}
}

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
  <button
    type="button"
    :title="title"
    :style="{
      left: `${placed.x}px`,
      top: `${placed.y}px`,
      width: `${placed.width}px`,
      height: `${placed.height}px`,
    }"
    class="absolute flex items-center gap-2 rounded-md border border-edge-strong bg-surface-raised px-1.5 text-left text-sm text-ink transition-opacity hover:border-action-edge"
    :class="classes"
    @click.stop="onClick"
    @dblclick.stop="onDoubleClick"
  >
    <span class="size-6 shrink-0 rounded-sm grid place-items-center" :class="look.tint">
      <span class="text-sm" :class="look.icon" aria-hidden="true" />
    </span>
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
</template>
