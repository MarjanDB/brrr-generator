<script setup lang="ts">
import { computed } from "vue";
import { CardState, type SplitFactor, SplitFactorKind } from "~/types/provenanceGraph";
import { ColorIntent } from "~/types/ui";

const props = defineProps<{
	factor: SplitFactor;
	x: number;
	y: number;
	state: CardState;
	locale: string;
}>();

const { t } = useI18n();
const { splitBadge } = useGraphText();

const text = computed(() => splitBadge(props.factor));

// The ratio as the corporate action chip writes it: 4 shares into 40 is 10 : 1.
const hint = computed(() => {
	const amount = ProvenanceFields.formatNumber(String(props.factor.amount), props.locale);
	return props.factor.kind === SplitFactorKind.MULTIPLY
		? t("download_graph_split_hint", { before: amount, after: "1", n: amount })
		: t("download_graph_split_hint_reverse", { before: "1", after: amount, n: amount });
});
</script>

<template>
  <AppTooltip :content="hint">
    <AppBadge
      :color="ColorIntent.ACCENT"
      pill
      :style="{ left: `${x}px`, top: `${y}px` }"
      class="absolute -translate-x-1/2 -translate-y-1/2 gap-0.5 transition-opacity"
      :class="state === CardState.DIMMED ? 'opacity-15' : ''"
    >
      <span class="i-mdi-call-split" aria-hidden="true" />
      {{ text }}
    </AppBadge>
  </AppTooltip>
</template>
