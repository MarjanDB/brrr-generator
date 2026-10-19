import type { ProvenanceNode } from "@brrr/lib";
import { type Chart, defaults, type Plugin } from "chart.js";
import type { ChartThemeColors } from "~/composables/useChartTheme";
import {
	type ArcGeometry,
	MarkState,
	type Point,
	type Timeline,
	type TimelineArc,
	type TimelineMark,
	TimelineMarkKind,
	TimelineWeight,
} from "~/types/timeline";
import { arcGeometry, arcHit, markStateOf, taxYearSpan } from "~/utils/instrumentTimeline";

// Everything here is the first pass of how the timeline looks: the marker shapes, how high an arc
// rises, how it ends. The data, the state and the interaction around it are final.

export type TimelineDrawState = {
	timeline: Timeline;
	focus: ProvenanceNode | null;
	lit: ReadonlySet<ProvenanceNode> | null;
	colors: ChartThemeColors;
	// The report's tax year, shaded behind the marks
	year: number;
};

// A chart.js plugin, plus the arcs' hit test: arcs are not chart elements, so the component asks.
export type TimelineMarksPlugin = Plugin<"scatter"> & {
	arcAt(point: Point, tolerance: number): TimelineArc | null;
};

type PlacedArc = { arc: TimelineArc; geometry: ArcGeometry };

// What's on the form is drawn full size and opaque, with arcs as thick as their quantity; what's
// there for context is small and faint, with thin dotted arcs. A mark or an arc in the chain the
// user picked is opaque whatever its weight.
const markRadius: Record<TimelineWeight, number> = {
	[TimelineWeight.REPORTED]: 7,
	[TimelineWeight.CONTEXT]: 4,
};
const contextAlpha = 0.45;
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

function alphaOf(weight: TimelineWeight, markState: MarkState): number {
	if (markState === MarkState.FOCUSED || markState === MarkState.LIT) {
		return 1;
	}
	const alpha = weight === TimelineWeight.CONTEXT ? contextAlpha : 1;
	return markState === MarkState.DIMMED ? alpha * dimmedAlpha : alpha;
}

function placeArcs(chart: Chart<"scatter">, timeline: Timeline): PlacedArc[] {
	const axis = chart.scales.y?.getPixelForValue(0) ?? 0;
	return timeline.arcs.map((arc) => {
		const axisY = axis - markRadius[arc.weight];
		const available = Math.max(4, axisY - chart.chartArea.top - 2);
		const x1 = pixelOf(chart, arc.from).x;
		const x2 = pixelOf(chart, arc.to).x;
		const rise = Math.min(available, Math.max(12, Math.abs(x2 - x1) * 0.2));
		return { arc, geometry: arcGeometry(x1, x2, axisY, rise) };
	});
}

// The tax year as a band from its first day to the next year's, under the grid, its year in the
// bottom corner, below the marks, where no arc reaches.
function drawTaxYear(chart: Chart<"scatter">, state: TimelineDrawState) {
	const x = chart.scales.x;
	const span = x === undefined ? null : taxYearSpan(state.year, { min: x.min, max: x.max });
	if (x === undefined || span === null) {
		return;
	}
	const left = x.getPixelForValue(span.from);
	const right = x.getPixelForValue(span.to);
	const { top, bottom } = chart.chartArea;
	const ctx = chart.ctx;
	ctx.save();
	ctx.fillStyle = state.colors.taxYear;
	ctx.fillRect(left, top, right - left, bottom - top);
	ctx.fillStyle = state.colors.ticks;
	ctx.font = `600 11px ${defaults.font.family}`;
	ctx.textBaseline = "bottom";
	ctx.fillText(String(state.year), left + 6, bottom - 4);
	ctx.restore();
}

function drawArcs(ctx: CanvasRenderingContext2D, placed: PlacedArc[], state: TimelineDrawState) {
	for (const { arc, geometry } of placed) {
		const stateOfLot = markStateOf(arc.lot, state.focus, state.lit);
		const emphasised = stateOfLot === MarkState.FOCUSED || stateOfLot === MarkState.LIT;
		ctx.save();
		ctx.globalAlpha = alphaOf(arc.weight, stateOfLot);
		ctx.strokeStyle = emphasised ? state.colors.focus : state.colors.arc;
		if (arc.weight === TimelineWeight.REPORTED) {
			ctx.lineWidth = 1.5 + Math.min(4, Math.sqrt(arc.quantity) * 0.7);
		} else {
			ctx.lineWidth = 1.5;
			ctx.lineCap = "round";
			ctx.setLineDash([0.5, 4]);
		}
		ctx.beginPath();
		ctx.moveTo(geometry.start.x, geometry.start.y);
		ctx.quadraticCurveTo(geometry.control.x, geometry.control.y, geometry.end.x, geometry.end.y);
		ctx.stroke();
		ctx.restore();
	}
}

function markPath(
	ctx: CanvasRenderingContext2D,
	kind: TimelineMarkKind,
	at: Point,
	radius: number,
) {
	ctx.beginPath();
	switch (kind) {
		case TimelineMarkKind.BOUGHT:
			ctx.moveTo(at.x, at.y - radius);
			ctx.lineTo(at.x + radius, at.y + radius);
			ctx.lineTo(at.x - radius, at.y + radius);
			ctx.closePath();
			return;
		case TimelineMarkKind.SOLD:
			ctx.moveTo(at.x, at.y + radius);
			ctx.lineTo(at.x + radius, at.y - radius);
			ctx.lineTo(at.x - radius, at.y - radius);
			ctx.closePath();
			return;
		case TimelineMarkKind.CORPORATE_ACTION:
			ctx.moveTo(at.x, at.y - radius - 1);
			ctx.lineTo(at.x + radius + 1, at.y);
			ctx.lineTo(at.x, at.y + radius + 1);
			ctx.lineTo(at.x - radius - 1, at.y);
			ctx.closePath();
			return;
		case TimelineMarkKind.DIVIDEND:
			ctx.arc(at.x, at.y, radius - 1, 0, Math.PI * 2);
			return;
		case TimelineMarkKind.TAX:
			ctx.arc(at.x, at.y, radius / 2, 0, Math.PI * 2);
			return;
		case TimelineMarkKind.BROKER_LOT:
			ctx.arc(at.x, at.y, radius - 1, 0, Math.PI * 2);
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
	const radius = markRadius[mark.weight];
	ctx.save();
	ctx.globalAlpha = alphaOf(mark.weight, markState);
	if (markState === MarkState.FOCUSED || markState === MarkState.LIT) {
		ctx.strokeStyle = state.colors.focus;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(at.x, at.y, radius + 5, 0, Math.PI * 2);
		ctx.stroke();
	}
	markPath(ctx, mark.kind, at, radius);
	if (mark.kind === TimelineMarkKind.BROKER_LOT) {
		ctx.setLineDash([3, 3]);
		ctx.strokeStyle = color;
		ctx.lineWidth = mark.weight === TimelineWeight.REPORTED ? 1.5 : 1;
		ctx.stroke();
	} else {
		ctx.fillStyle = color;
		ctx.fill();
	}
	ctx.restore();
}

// Draws the tax year under the grid, the matched lots' arcs under the chart's own points and the
// marks over them. The state is read through `getState` on every draw, so a focus change only needs
// `chart.update("none")`.
export function timelineMarksPlugin(getState: () => TimelineDrawState): TimelineMarksPlugin {
	let placed: PlacedArc[] = [];
	return {
		id: "timelineMarks",
		beforeDraw(chart) {
			drawTaxYear(chart, getState());
		},
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
