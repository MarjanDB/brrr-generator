import type { GraphPoint } from "~/types/provenanceGraph";

// Edges bend at least this far out of each end, so a short hop still reads as a curve.
const minimumBend = 24;

// The S-curve from one point to another, leaving and arriving level, as an SVG path: how the
// provenance graph draws its edges.
function edgeCurve(from: GraphPoint, to: GraphPoint): string {
	const bend = Math.max(minimumBend, (to.x - from.x) / 2);
	return `M${from.x},${from.y} C${from.x + bend},${from.y} ${to.x - bend},${to.y} ${to.x},${to.y}`;
}

// The curves drawn between two points.
export const EdgeCurves = {
	between: edgeCurve,
};
