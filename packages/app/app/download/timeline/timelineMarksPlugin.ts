import type { ProvenanceNode } from "@brrr/lib";
import type { Chart, Plugin } from "chart.js";
import type { ChartThemeColors } from "~/composables/useChartTheme";
import type { ArcGeometry, Point } from "~/download/timeline/ArcGeometry";
import { arcGeometry, arcHit } from "~/download/timeline/arcCurve";
import { MarkState } from "~/download/timeline/MarkState";
import { markStateOf } from "~/download/timeline/markStateOf";
import type { Timeline } from "~/download/timeline/Timeline";
import type { TimelineArc } from "~/download/timeline/TimelineArc";
import type { TimelineMark } from "~/download/timeline/TimelineMark";
import { TimelineMarkKind } from "~/download/timeline/TimelineMarkKind";

// Everything here is the first pass of how the timeline looks: the marker shapes, how high an arc
// rises, how it ends. The data, the state and the interaction around it are final.

export type TimelineDrawState = {
	timeline: Timeline;
	focus: ProvenanceNode;
	lit: ReadonlySet<ProvenanceNode> | null;
	colors: ChartThemeColors;
};

// A chart.js plugin, plus the arcs' hit test: arcs are not chart elements, so the component asks.
export type TimelineMarksPlugin = Plugin<"scatter"> & {
	arcAt(point: Point, tolerance: number): TimelineArc | null;
};

type PlacedArc = { arc: TimelineArc; geometry: ArcGeometry };

const markRadius = 7;
const dimmedAlpha = 0.25;

const markColors: Record<TimelineMarkKind, keyof ChartThemeColors> = {
	[TimelineMarkKind.BOUGHT]: "bought",
	[TimelineMarkKind.SOLD]: "sold",
	[TimelineMarkKind.CORPORATE_ACTION]: "corporateAction",
	[TimelineMarkKind.DIVIDEND]: "dividend",
	[TimelineMarkKind.TAX]: "tax",
	[TimelineMarkKind.BROKER_LOT]: "brokerLot",
};

function pixelOf(chart: Chart<"scatter">, mark: TimelineMark): Point {
	return {
		x: chart.scales.x?.getPixelForValue(mark.at) ?? 0,
		y: chart.scales.y?.getPixelForValue(-mark.stack) ?? 0,
	};
}

function placeArcs(chart: Chart<"scatter">, timeline: Timeline): PlacedArc[] {
	const axisY = (chart.scales.y?.getPixelForValue(0) ?? 0) - markRadius;
	const available = Math.max(4, axisY - chart.chartArea.top - 2);
	return timeline.arcs.map((arc) => {
		const x1 = pixelOf(chart, arc.from).x;
		const x2 = pixelOf(chart, arc.to).x;
		const rise = Math.min(available, Math.max(12, Math.abs(x2 - x1) * 0.2));
		return { arc, geometry: arcGeometry(x1, x2, axisY, rise) };
	});
}

function drawArcs(ctx: CanvasRenderingContext2D, placed: PlacedArc[], state: TimelineDrawState) {
	for (const { arc, geometry } of placed) {
		const stateOfLot = markStateOf(arc.lot, state.focus, state.lit);
		const emphasised = stateOfLot === MarkState.FOCUSED || stateOfLot === MarkState.LIT;
		ctx.save();
		ctx.globalAlpha = stateOfLot === MarkState.DIMMED ? dimmedAlpha : 1;
		ctx.strokeStyle = emphasised ? state.colors.focus : state.colors.arc;
		ctx.lineWidth = 1.5 + Math.min(4, Math.sqrt(arc.quantity) * 0.7);
		ctx.beginPath();
		ctx.moveTo(geometry.start.x, geometry.start.y);
		ctx.quadraticCurveTo(geometry.control.x, geometry.control.y, geometry.end.x, geometry.end.y);
		ctx.stroke();
		ctx.restore();
	}
}

function markPath(ctx: CanvasRenderingContext2D, kind: TimelineMarkKind, at: Point) {
	ctx.beginPath();
	switch (kind) {
		case TimelineMarkKind.BOUGHT:
			ctx.moveTo(at.x, at.y - markRadius);
			ctx.lineTo(at.x + markRadius, at.y + markRadius);
			ctx.lineTo(at.x - markRadius, at.y + markRadius);
			ctx.closePath();
			return;
		case TimelineMarkKind.SOLD:
			ctx.moveTo(at.x, at.y + markRadius);
			ctx.lineTo(at.x + markRadius, at.y - markRadius);
			ctx.lineTo(at.x - markRadius, at.y - markRadius);
			ctx.closePath();
			return;
		case TimelineMarkKind.CORPORATE_ACTION:
			ctx.moveTo(at.x, at.y - markRadius - 1);
			ctx.lineTo(at.x + markRadius + 1, at.y);
			ctx.lineTo(at.x, at.y + markRadius + 1);
			ctx.lineTo(at.x - markRadius - 1, at.y);
			ctx.closePath();
			return;
		case TimelineMarkKind.DIVIDEND:
			ctx.arc(at.x, at.y, markRadius - 1, 0, Math.PI * 2);
			return;
		case TimelineMarkKind.TAX:
			ctx.arc(at.x, at.y, markRadius - 3.5, 0, Math.PI * 2);
			return;
		case TimelineMarkKind.BROKER_LOT:
			ctx.arc(at.x, at.y, markRadius - 1, 0, Math.PI * 2);
			return;
	}
}

function drawMark(
	ctx: CanvasRenderingContext2D,
	chart: Chart<"scatter">,
	mark: TimelineMark,
	state: TimelineDrawState,
) {
	const at = pixelOf(chart, mark);
	const markState = markStateOf(mark.node, state.focus, state.lit);
	const color = state.colors[markColors[mark.kind]];
	ctx.save();
	ctx.globalAlpha = markState === MarkState.DIMMED ? dimmedAlpha : 1;
	if (markState === MarkState.FOCUSED || markState === MarkState.LIT) {
		ctx.strokeStyle = state.colors.focus;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(at.x, at.y, markRadius + 5, 0, Math.PI * 2);
		ctx.stroke();
	}
	markPath(ctx, mark.kind, at);
	if (mark.kind === TimelineMarkKind.BROKER_LOT) {
		ctx.setLineDash([3, 3]);
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.5;
		ctx.stroke();
	} else {
		ctx.fillStyle = color;
		ctx.fill();
	}
	ctx.restore();
}

// Draws the matched lots' arcs under the chart's own points and the marks over them. The state is
// read through `getState` on every draw, so a focus change only needs `chart.update("none")`.
export function timelineMarksPlugin(getState: () => TimelineDrawState): TimelineMarksPlugin {
	let placed: PlacedArc[] = [];
	return {
		id: "timelineMarks",
		beforeDatasetsDraw(chart) {
			const state = getState();
			placed = placeArcs(chart, state.timeline);
			drawArcs(chart.ctx, placed, state);
		},
		afterDatasetsDraw(chart) {
			const state = getState();
			for (const mark of state.timeline.marks) {
				drawMark(chart.ctx, chart, mark, state);
			}
		},
		arcAt(point, tolerance) {
			return placed.find(({ geometry }) => arcHit(geometry, point, tolerance))?.arc ?? null;
		},
	};
}
