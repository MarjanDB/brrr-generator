<script setup lang="ts">
import { computed } from "vue";
import { type LandingConnector, LandingConnectorAnchor, LandingSide } from "~/types/landing";
import { EdgeCurves } from "~/utils/edgeCurves";

const props = defineProps<{
	side: LandingSide;
	// The card's place in its column, and how many cards the column has.
	index: number;
	count: number;
}>();

// The mark's height (`size-33` in LandingMark) and the gap between cards in a column (`gap-2.5` in
// LandingFlow): the connectors' heights are worked out from them.
const markHeight = 132;
const cardGap = 10;
// Arrows meet the mark this far apart at most, and within this share of its height around its
// middle.
const maximumSpread = 22;
const spreadShare = 0.6;

function rounded(value: number): number {
	return Number(value.toFixed(2));
}

// How far apart the cards' points on the mark are.
function spreadOf(count: number): number {
	return count <= 1
		? 0
		: rounded(Math.min(maximumSpread, (markHeight * spreadShare) / (count - 1)));
}

// The connector beside the i-th of a side's cards. Every card in a column is as tall as the
// tallest one, and the column shares its middle with the mark, so the i-th card's middle sits
// k·(card + gap) from the mark's middle and its point on the mark k·spread from it, with k counted
// from the column's middle. The connector spans the difference, as a calc() on the card's height
// (100% inside the card's row), so a server can render it without measuring anything. Brokers and
// tax offices both draw from left to right, so the side only decides which end is the card's.
function landingConnectorOf(
	side: LandingSide,
	index: number,
	count: number,
): LandingConnector {
	const k = index - (count - 1) / 2;
	if (k === 0) {
		return {
			level: true,
			anchor: LandingConnectorAnchor.TOP,
			height: "2px",
			leftEndAtTop: true,
			curve: "M0,50 L100,50",
		};
	}
	const steps = Math.abs(k);
	const offset = rounded(steps * (cardGap - spreadOf(count)));
	const height = `calc(${steps} * 100% ${offset < 0 ? "-" : "+"} ${Math.abs(offset)}px)`;
	// A card above the column's middle hangs its connector down from its middle, a card below it
	// stands its connector up on it.
	const anchor = k < 0 ? LandingConnectorAnchor.TOP : LandingConnectorAnchor.BOTTOM;
	const cardIsLeft = side === LandingSide.BROKER;
	const cardEndAtTop = anchor === LandingConnectorAnchor.TOP;
	const leftEndAtTop = cardIsLeft ? cardEndAtTop : !cardEndAtTop;
	return {
		level: false,
		anchor,
		height,
		leftEndAtTop,
		curve: leftEndAtTop
			? EdgeCurves.between({ x: 0, y: 0 }, { x: 100, y: 100 })
			: EdgeCurves.between({ x: 0, y: 100 }, { x: 100, y: 0 }),
	};
}

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
