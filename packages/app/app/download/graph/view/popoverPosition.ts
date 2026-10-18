import type { GraphPoint } from "~/download/graph/GraphPoint";

export type PopoverPositionArgs = {
	// The node it hangs on, in graph units.
	anchorX: number;
	anchorY: number;
	anchorWidth: number;
	popoverWidth: number;
	popoverHeight: number;
	canvasWidth: number;
	canvasHeight: number;
	// How the graph is drawn on the canvas.
	scale: number;
	shift: number;
};

const gap = 14;
const edgeMargin = 4;

// To the right of the node; to its left when that would pass the canvas's right edge; moved up
// when it would pass the bottom. In canvas pixels, not scaled.
export function popoverPosition(args: PopoverPositionArgs): GraphPoint {
	let x = args.shift + (args.anchorX + args.anchorWidth + gap) * args.scale;
	if (x + args.popoverWidth > args.canvasWidth) {
		x = args.shift + args.anchorX * args.scale - args.popoverWidth - gap;
	}
	let y = args.anchorY * args.scale;
	if (y + args.popoverHeight > args.canvasHeight) {
		y = Math.max(0, args.canvasHeight - args.popoverHeight);
	}
	return { x: Math.max(edgeMargin, x), y };
}
