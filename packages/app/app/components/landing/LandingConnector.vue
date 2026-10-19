<script setup lang="ts">
import { computed } from "vue";
import { LandingConnectorAnchor, LandingSide } from "~/types/landing";

const props = defineProps<{
	side: LandingSide;
	// The card's place in its column, and how many cards the column has.
	index: number;
	count: number;
}>();

const connector = computed(() => landingConnectorOf(props.side, props.index, props.count));

// The box sits in the 100px gap between the card and the mark (`lg:gap-x-25` in LandingFlow): a
// broker's from its right edge to 4px short of the mark, a tax office's from 3px past the mark to
// 4px short of the card. Vertically it starts at the card's middle.
const boxStyle = computed(() => {
	const c = connector.value;
	const across =
		props.side === LandingSide.BROKER
			? { left: "100%", width: "96px" }
			: { right: "calc(100% + 4px)", width: "93px" };
	if (c.level) {
		return { ...across, top: "calc(50% - 1px)", height: c.height };
	}
	return c.anchor === LandingConnectorAnchor.TOP
		? { ...across, top: "50%", height: c.height }
		: { ...across, bottom: "50%", height: c.height };
});

// The arrowhead points right from the arrow's right end, its tip a pixel past it.
const headStyle = computed(() => {
	const c = connector.value;
	const left = "calc(100% - 8px)";
	if (c.level) {
		return { left, top: "calc(50% - 5px)" };
	}
	return { left, top: c.leftEndAtTop ? "calc(100% - 5px)" : "-5px" };
});
</script>

<template>
	<!-- One card's arrow on the landing page, drawn by CSS alone so the server renders it. The curve
	     is stretched over the box; its stroke isn't. -->
	<div class="pointer-events-none absolute hidden lg:block" :style="boxStyle" aria-hidden="true">
		<svg class="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
			<path
				:d="connector.curve"
				fill="none"
				stroke-width="1.7"
				stroke-linecap="round"
				vector-effect="non-scaling-stroke"
				class="stroke-action-edge"
			/>
		</svg>
		<svg class="absolute h-2.5 w-2.25" :style="headStyle" viewBox="0 0 9 10" aria-hidden="true">
			<path d="M0,0 L9,5 L0,10 Z" class="fill-action-edge" />
		</svg>
	</div>
</template>
