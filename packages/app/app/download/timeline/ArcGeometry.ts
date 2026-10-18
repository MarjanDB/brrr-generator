export type Point = { x: number; y: number };

export type ArcGeometryArgs = {
	start: Point;
	end: Point;
	control: Point;
};

// A quadratic curve: where it starts, where it ends, and the point that bends it.
export class ArcGeometry {
	public readonly start: Point;
	public readonly end: Point;
	public readonly control: Point;

	public constructor(args: ArcGeometryArgs) {
		this.start = args.start;
		this.end = args.end;
		this.control = args.control;
	}
}
