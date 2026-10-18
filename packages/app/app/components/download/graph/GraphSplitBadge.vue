<script setup lang="ts">
import { computed } from "vue";
import { type SplitFactor, SplitFactorKind } from "~/download/graph/SplitFactor";
import { CardState } from "~/download/graph/view/CardState";
import { splitBadgeText } from "~/download/graph/view/splitBadgeText";

const props = defineProps<{
	factor: SplitFactor;
	x: number;
	y: number;
	state: CardState;
	locale: string;
}>();

const { t } = useI18n();

const text = computed(() => splitBadgeText(props.factor, props.locale));

// The ratio as the corporate action chip writes it: 4 shares into 40 is 10 : 1.
const hint = computed(() => {
	const amount = formatNumber(String(props.factor.amount), props.locale);
	return props.factor.kind === SplitFactorKind.MULTIPLY
		? t("download_graph_split_hint", { before: amount, after: "1", n: amount })
		: t("download_graph_split_hint_reverse", { before: "1", after: amount, n: amount });
});
</script>

<template>
  <span
    :title="hint"
    :style="{ left: `${x}px`, top: `${y}px` }"
    class="absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-full border border-accent-edge bg-accent-soft px-1.5 text-xs leading-4 text-accent-ink transition-opacity"
    :class="state === CardState.DIMMED ? 'opacity-15' : ''"
  >
    <span class="i-mdi-call-split" aria-hidden="true" />
    {{ text }}
  </span>
</template>
