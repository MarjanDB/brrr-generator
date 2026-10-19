import { type LandingConnector, LandingConnectorAnchor, LandingSide } from "~/types/landing";
import { edgeCurve } from "~/utils/edgeCurve";

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
export function landingConnectorOf(
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
			? edgeCurve({ x: 0, y: 0 }, { x: 100, y: 100 })
			: edgeCurve({ x: 0, y: 100 }, { x: 100, y: 0 }),
	};
}
