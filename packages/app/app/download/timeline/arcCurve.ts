import { ArcGeometry, type Point } from "~/download/timeline/ArcGeometry";

const samples = 24;

// An arc from one point of the axis to another, rising `rise` above its middle. A quadratic curve
// reaches half way to its control point, so the control sits twice as high.
export function arcGeometry(x1: number, x2: number, axisY: number, rise: number): ArcGeometry {
	return new ArcGeometry({
		start: { x: x1, y: axisY },
		end: { x: x2, y: axisY },
		control: { x: (x1 + x2) / 2, y: axisY - 2 * rise },
	});
}

function pointAt(arc: ArcGeometry, t: number): Point {
	const mirror = 1 - t;
	return {
		x: mirror * mirror * arc.start.x + 2 * mirror * t * arc.control.x + t * t * arc.end.x,
		y: mirror * mirror * arc.start.y + 2 * mirror * t * arc.control.y + t * t * arc.end.y,
	};
}

// Whether the point is within `tolerance` of the curve, measured to 24 points along it.
export function arcHit(arc: ArcGeometry, point: Point, tolerance: number): boolean {
	for (let index = 0; index <= samples; index++) {
		const onCurve = pointAt(arc, index / samples);
		if (Math.hypot(onCurve.x - point.x, onCurve.y - point.y) <= tolerance) {
			return true;
		}
	}
	return false;
}
