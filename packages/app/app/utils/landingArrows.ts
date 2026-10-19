import type { LandingArrow, LandingBox } from "~/types/landing";
import type { GraphPoint } from "~/types/provenanceGraph";
import { edgeCurve } from "~/utils/edgeCurve";

// Arrows meet the mark this far apart at most, and within this share of its height around its
// middle.
const maximumSpread = 22;
const spreadShare = 0.6;
// A line stops this short of what it points at, and its head's tip one pixel nearer.
const lineGap = 4;
const headLength = 9;
const headHalfWidth = 5;

// Where the i-th of n arrows meets the mark's edge: spread evenly around the mark's middle.
function pointOnMark(mark: LandingBox, index: number, count: number): number {
	const middle = mark.y + mark.height / 2;
	if (count <= 1) {
		return middle;
	}
	const spread = Math.min(maximumSpread, (mark.height * spreadShare) / (count - 1));
	return middle + (index - (count - 1) / 2) * spread;
}

// An arrowhead pointing right, its tip at the given point.
function headAt(tip: GraphPoint): string {
	const back = tip.x - headLength;
	return `M${back},${tip.y - headHalfWidth} L${tip.x},${tip.y} L${back},${tip.y + headHalfWidth} Z`;
}

function arrowBetween(from: GraphPoint, to: GraphPoint): LandingArrow {
	return {
		from,
		to,
		line: edgeCurve(from, to),
		head: headAt({ x: to.x + 1, y: to.y }),
	};
}

// The arrows from each broker card into the mark and from the mark out to each tax office card,
// each meeting the mark at a point of its own.
export function landingArrowsOf(layout: {
	mark: LandingBox;
	brokers: LandingBox[];
	offices: LandingBox[];
}): { brokers: LandingArrow[]; offices: LandingArrow[] } {
	const { mark, brokers, offices } = layout;
	return {
		brokers: brokers.map((card, index) =>
			arrowBetween(
				{ x: card.x + card.width, y: card.y + card.height / 2 },
				{ x: mark.x - lineGap, y: pointOnMark(mark, index, brokers.length) },
			),
		),
		offices: offices.map((card, index) =>
			arrowBetween(
				{ x: mark.x + mark.width + lineGap - 1, y: pointOnMark(mark, index, offices.length) },
				{ x: card.x - lineGap, y: card.y + card.height / 2 },
			),
		),
	};
}
