<script setup lang="ts">
import { useResizeObserver } from "@vueuse/core";
import { computed, ref, useTemplateRef } from "vue";
import { ColorIntent } from "~/types/ui";

// The ticker's letters in its own colour, or a "?" when the company behind it is unknown. The ticker
// is written beside it, so it is hidden from screen readers.
const props = defineProps<{
	ticker: string;
	large: boolean;
	unknown: boolean;
}>();

const text = computed(() => (props.unknown ? "?" : NodeLooks.monogramText(props.ticker)));
// An unknown company is drawn dashed, in the warning colour.
const tint = computed(() =>
	props.unknown
		? [
				IntentClasses.soft[ColorIntent.WARNING],
				IntentClasses.edge[ColorIntent.WARNING],
				"border border-dashed",
			]
		: IntentClasses.soft[NodeLooks.monogramIntent(props.ticker)],
);

// Letters wider than the box (four wide ones, such as GOOG, at the box's type size) are scaled down
// to fit, keeping this many pixels clear on each side. A scale leaves the letters' measured width
// as it was, so fitting them doesn't change what is measured; a monogram drawn in a hidden tab is
// measured once it shows.
const clearance = 3;
const box = useTemplateRef<HTMLElement>("box");
const letters = useTemplateRef<HTMLElement>("letters");
const scale = ref(1);
useResizeObserver(letters, ([entry]) => {
	const width = entry?.contentRect.width ?? 0;
	const room = (box.value?.clientWidth ?? 0) - 2 * clearance;
	scale.value = width > room && room > 0 ? room / width : 1;
});
</script>

<template>
	<span
		ref="box"
		class="shrink-0 flex items-center justify-center font-bold"
		:class="[tint, large ? 'size-10 rounded-lg text-sm' : 'size-8 rounded-md text-xs']"
		aria-hidden="true"
	>
		<span ref="letters" class="whitespace-nowrap" :style="{ transform: `scale(${scale})` }">{{ text }}</span>
	</span>
</template>
