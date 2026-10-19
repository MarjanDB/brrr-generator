import type { GraphPoint } from "~/types/provenanceGraph";

// A card or the mark as the landing page lays it out: its top left corner and its size, in pixels
// from the top left of the row they sit in.
export type LandingBox = { x: number; y: number; width: number; height: number };

// One arrow on the landing page: the line's ends, the line as an SVG path and its arrowhead.
export type LandingArrow = {
	from: GraphPoint;
	to: GraphPoint;
	line: string;
	head: string;
};
