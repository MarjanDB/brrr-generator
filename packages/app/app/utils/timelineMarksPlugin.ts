import type { ProvenanceNode } from "@brrr/lib";
import { type Chart, defaults, type Plugin } from "chart.js";
import type { ChartThemeColors } from "~/composables/useChartTheme";
import {
	MarkState,
	type Point,
	type Timeline,
	type TimelineBar,
	type TimelineMark,
	TimelineMarkKind,
	type TimelinePoint,
	type TimelineRow,
	TimelineRowKind,
	TimelineWeight,
} from "~/types/timeline";
import {
	barOutline,
	barStateOf,
	barY,
	labelFits,
	markSize,
	markStateOf,
	offsetPolygon,
	pointY,
	taxYearSpan,
} from "~/utils/instrumentTimeline";

// Everything here is the first pass of how the timeline looks: the marker shapes, the bars'
// thickness and fills, where a label goes. The data, the state and the interaction around it are
// final.

export type TimelineDrawState = {
	timeline: Timeline;
	// The rows the bars are drawn on, folded or spread, top to bottom
	rows: TimelineRow[];
	focus: ProvenanceNode | null;
	lit: ReadonlySet<ProvenanceNode> | null;
	colors: ChartThemeColors;
	// The report's tax year, shaded behind the marks
	year: number;
	// The text inside a row's bar, where it fits
	describeRow: (row: TimelineRow) => string;
};

// A chart.js plugin, plus the rows' hit test: bars are not chart elements, so the component asks.
export type TimelineMarksPlugin = Plugin<"scatter"> & {
	rowAt(point: Point): TimelineRow | null;
};

type PlacedBar = { bar: TimelineBar; x1: number; x2: number; y: number; thickness: number };
// A row and the span of its bars, from the first one's start to the last one's end.
type PlacedRow = {
	row: TimelineRow;
	bars: PlacedBar[];
	x1: number;
	x2: number;
	y: number;
	thickness: number;
};

// Every bar, triangle and point is one size (`markSize`), its focus outline included. What's on the
// form is drawn opaque; what's there for context is faint, its lots dotted, and what is still open
// fades out to the right. A mark or a bar in the chain the user picked is opaque whatever its
// weight.
const contextAlpha = 0.45;
const dimmedAlpha = 0.25;
// A bar is easy to hit even when it's thin.
const barHitHalfHeight = 6;

const brokerLotLine = 1.5;
const focusLine = 2;
// The gap between a focused lot and its outline, the same from every edge.
const outlineGap = 2;

const markColors: Record<TimelineMarkKind, keyof ChartThemeColors> = {
	[TimelineMarkKind.BOUGHT]: "bought",
	[TimelineMarkKind.SOLD]: "sold",
	[TimelineMarkKind.CORPORATE_ACTION]: "corporateAction",
	[TimelineMarkKind.DIVIDEND]: "dividend",
	[TimelineMarkKind.TAX]: "tax",
	[TimelineMarkKind.BROKER_LOT]: "brokerLot",
};

function isEmphasised(markState: MarkState): boolean {
	return markState === MarkState.FOCUSED || markState === MarkState.LIT;
}

function alphaOf(weight: TimelineWeight, markState: MarkState): number {
	if (isEmphasised(markState)) {
		return 1;
	}
	const alpha = weight === TimelineWeight.CONTEXT ? contextAlpha : 1;
	return markState === MarkState.DIMMED ? alpha * dimmedAlpha : alpha;
}

function pitchOf(chart: Chart<"scatter">): number {
	const y = chart.scales.y;
	return y === undefined ? 0 : Math.abs(y.getPixelForValue(1) - y.getPixelForValue(0));
}

function placeRows(chart: Chart<"scatter">, rows: TimelineRow[]): PlacedRow[] {
	const x = chart.scales.x;
	const y = chart.scales.y;
	if (x === undefined || y === undefined) {
		return [];
	}
	const thickness = markSize(pitchOf(chart));
	return rows.map((row, index) => {
		const at = y.getPixelForValue(barY(index, rows.length));
		const bars = row.bars.map((bar) => ({
			bar,
			x1: x.getPixelForValue(bar.opened.at),
			x2: bar.closed === null ? chart.chartArea.right : x.getPixelForValue(bar.closed.at),
			y: at,
			thickness,
		}));
		return {
			row,
			bars,
			x1: Math.min(...bars.map((bar) => bar.x1)),
			x2: Math.max(...bars.map((bar) => bar.x2)),
			y: at,
			thickness,
		};
	});
}

// A folded row is lit or focused when one of its bars is, and dimmed when a chain is lit that
// none of them is in.
function rowStateOf(placed: PlacedRow, state: TimelineDrawState): MarkState {
	const states = placed.row.bars.map((bar) => barStateOf(bar, state.focus, state.lit));
	if (states.includes(MarkState.FOCUSED)) {
		return MarkState.FOCUSED;
	}
	if (states.includes(MarkState.LIT)) {
		return MarkState.LIT;
	}
	return states.includes(MarkState.DIMMED) ? MarkState.DIMMED : MarkState.NORMAL;
}

// The tax year as a band from its first day to the next year's, under the grid, its year in the
// bottom corner, under the bars.
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

function drawBar(ctx: CanvasRenderingContext2D, placed: PlacedBar, state: TimelineDrawState) {
	const { bar, x1, x2, y, thickness } = placed;
	const barState = barStateOf(bar, state.focus, state.lit);
	const fade = barState === MarkState.DIMMED ? dimmedAlpha : 1;
	const top = y - thickness / 2;
	const width = Math.max(1, x2 - x1);
	ctx.save();
	if (bar.closed === null) {
		const gradient = ctx.createLinearGradient(x1, 0, x2, 0);
		gradient.addColorStop(0, state.colors.arc);
		gradient.addColorStop(1, "transparent");
		ctx.globalAlpha = fade * (isEmphasised(barState) ? 0.6 : 0.35);
		ctx.fillStyle = gradient;
		ctx.fillRect(x1, top, width, thickness);
	} else if (bar.weight === TimelineWeight.REPORTED) {
		ctx.globalAlpha = fade;
		ctx.fillStyle = state.colors.arc;
		ctx.fillRect(x1, top, width, thickness);
	} else {
		ctx.globalAlpha = fade * (isEmphasised(barState) ? 0.35 : 0.18);
		ctx.fillStyle = state.colors.arc;
		ctx.fillRect(x1, top, width, thickness);
		ctx.globalAlpha = fade * (isEmphasised(barState) ? 1 : 0.7);
		ctx.strokeStyle = state.colors.arc;
		ctx.lineWidth = 1;
		ctx.lineCap = "round";
		ctx.setLineDash([0.5, 3]);
		ctx.strokeRect(x1 + 0.5, top + 0.5, width - 1, thickness - 1);
	}
	ctx.restore();
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
			ctx.moveTo(at.x, at.y - radius);
			ctx.lineTo(at.x + radius, at.y);
			ctx.lineTo(at.x, at.y + radius);
			ctx.lineTo(at.x - radius, at.y);
			ctx.closePath();
			return;
		case TimelineMarkKind.DIVIDEND:
		case TimelineMarkKind.TAX:
			ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
			return;
		case TimelineMarkKind.BROKER_LOT:
			// Inset by half its dashed line, which is stroked on the circle.
			ctx.arc(at.x, at.y, radius - brokerLotLine / 2, 0, Math.PI * 2);
			return;
	}
}

// A trade at one end of a bar: part of the lot's shape, its triangle as tall and wide as the bar
// is thick, and as faint or as lit as the bar.
function drawBarEnd(
	ctx: CanvasRenderingContext2D,
	placed: PlacedBar,
	mark: TimelineMark,
	x: number,
	state: TimelineDrawState,
) {
	ctx.save();
	ctx.globalAlpha = alphaOf(placed.bar.weight, barStateOf(placed.bar, state.focus, state.lit));
	markPath(ctx, mark.kind, { x, y: placed.y }, placed.thickness / 2);
	ctx.fillStyle = state.colors[markColors[mark.kind]];
	ctx.fill();
	ctx.restore();
}

// A focused or lit lot is outlined around its whole shape, the bar and the outer halves of its
// triangles, the same gap from every edge.
function drawBarOutline(
	ctx: CanvasRenderingContext2D,
	placed: PlacedBar,
	state: TimelineDrawState,
) {
	const { bar, x1, x2, y, thickness } = placed;
	if (!isEmphasised(barStateOf(bar, state.focus, state.lit))) {
		return;
	}
	const shape = barOutline(x1, x2, y, thickness, bar.opened.kind, bar.closed?.kind ?? null);
	const outline = offsetPolygon(shape, outlineGap + focusLine / 2);
	ctx.save();
	ctx.strokeStyle = state.colors.focus;
	ctx.lineWidth = focusLine;
	ctx.lineJoin = "miter";
	ctx.beginPath();
	for (const [index, corner] of outline.entries()) {
		if (index === 0) {
			ctx.moveTo(corner.x, corner.y);
		} else {
			ctx.lineTo(corner.x, corner.y);
		}
	}
	ctx.closePath();
	ctx.stroke();
	ctx.restore();
}

// A row's text inside its bar, after the start's triangle, where it fits; nowhere else. On a solid
// bar it is in the page's colour, on a faint one in the text's.
function drawRowLabel(ctx: CanvasRenderingContext2D, placed: PlacedRow, state: TimelineDrawState) {
	const { row, x1, x2, y, thickness } = placed;
	const text = state.describeRow(row);
	ctx.save();
	ctx.font = `11px ${defaults.font.family}`;
	if (!labelFits(thickness, ctx.measureText(text).width, x2 - x1)) {
		ctx.restore();
		return;
	}
	const solid =
		row.kind === TimelineRowKind.BAR &&
		row.bars[0]?.closed !== null &&
		row.bars[0]?.weight === TimelineWeight.REPORTED;
	ctx.globalAlpha = rowStateOf(placed, state) === MarkState.DIMMED ? dimmedAlpha : 1;
	ctx.fillStyle = solid ? state.colors.barLabel : state.colors.tooltipText;
	ctx.textBaseline = "middle";
	ctx.fillText(text, x1 + thickness / 2 + 4, y + 0.5);
	ctx.restore();
}

// The lots closed in other years, folded: each lot faint over the same row, so where they overlap
// the row is darker.
function drawOtherYears(
	ctx: CanvasRenderingContext2D,
	placed: PlacedRow,
	state: TimelineDrawState,
) {
	const fade = rowStateOf(placed, state) === MarkState.DIMMED ? dimmedAlpha : 1;
	ctx.save();
	ctx.fillStyle = state.colors.arc;
	for (const bar of placed.bars) {
		ctx.globalAlpha = fade * 0.18;
		ctx.fillRect(bar.x1, bar.y - bar.thickness / 2, Math.max(1, bar.x2 - bar.x1), bar.thickness);
	}
	ctx.restore();
}

// What is still open, folded: one bar from the first open trade, fading out to the right.
function drawStillOpen(ctx: CanvasRenderingContext2D, placed: PlacedRow, state: TimelineDrawState) {
	const rowState = rowStateOf(placed, state);
	const fade = rowState === MarkState.DIMMED ? dimmedAlpha : 1;
	const gradient = ctx.createLinearGradient(placed.x1, 0, placed.x2, 0);
	gradient.addColorStop(0, state.colors.arc);
	gradient.addColorStop(1, "transparent");
	ctx.save();
	ctx.globalAlpha = fade * (isEmphasised(rowState) ? 0.6 : 0.35);
	ctx.fillStyle = gradient;
	ctx.fillRect(
		placed.x1,
		placed.y - placed.thickness / 2,
		Math.max(1, placed.x2 - placed.x1),
		placed.thickness,
	);
	ctx.restore();
}

// A folded row that holds the focus or a lit lot is outlined around its whole span.
function drawRowOutline(
	ctx: CanvasRenderingContext2D,
	placed: PlacedRow,
	state: TimelineDrawState,
) {
	if (!isEmphasised(rowStateOf(placed, state))) {
		return;
	}
	const gap = outlineGap + focusLine / 2;
	const half = placed.thickness / 2;
	ctx.save();
	ctx.strokeStyle = state.colors.focus;
	ctx.lineWidth = focusLine;
	ctx.strokeRect(
		placed.x1 - half - gap,
		placed.y - half - gap,
		placed.x2 - placed.x1 + placed.thickness + 2 * gap,
		placed.thickness + 2 * gap,
	);
	ctx.restore();
}

function drawPoint(
	ctx: CanvasRenderingContext2D,
	chart: Chart<"scatter">,
	point: TimelinePoint,
	state: TimelineDrawState,
) {
	const { mark } = point;
	const at = {
		x: chart.scales.x?.getPixelForValue(mark.at) ?? 0,
		y: chart.scales.y?.getPixelForValue(pointY(point.stack)) ?? 0,
	};
	const markState = markStateOf(mark.node, state.focus, state.lit);
	const color = state.colors[markColors[mark.kind]];
	const radius = markSize(pitchOf(chart)) / 2;
	ctx.save();
	ctx.globalAlpha = alphaOf(mark.weight, markState);
	if (isEmphasised(markState)) {
		ctx.strokeStyle = state.colors.focus;
		ctx.lineWidth = focusLine;
		ctx.beginPath();
		ctx.arc(at.x, at.y, radius + 5, 0, Math.PI * 2);
		ctx.stroke();
	}
	markPath(ctx, mark.kind, at, radius);
	if (mark.kind === TimelineMarkKind.BROKER_LOT) {
		ctx.setLineDash([3, 3]);
		ctx.strokeStyle = color;
		ctx.lineWidth = brokerLotLine;
		ctx.stroke();
	} else {
		ctx.fillStyle = color;
		ctx.fill();
	}
	ctx.restore();
}

// Draws the tax year under the grid, the rows' bars under the chart's own points, and their ends,
// outlines and labels and the points over them. A bar's row is drawn as its bar; the lots of other
// years and what is still open, folded, as one row each. The state is read through `getState` on
// every draw, so a focus change only needs `chart.update("none")`.
export function timelineMarksPlugin(getState: () => TimelineDrawState): TimelineMarksPlugin {
	let placed: PlacedRow[] = [];
	return {
		id: "timelineMarks",
		beforeDraw(chart) {
			drawTaxYear(chart, getState());
		},
		beforeDatasetsDraw(chart) {
			const state = getState();
			placed = placeRows(chart, state.rows);
			for (const row of placed) {
				switch (row.row.kind) {
					case TimelineRowKind.BAR:
						for (const bar of row.bars) {
							drawBar(chart.ctx, bar, state);
						}
						break;
					case TimelineRowKind.OTHER_YEARS:
						drawOtherYears(chart.ctx, row, state);
						break;
					case TimelineRowKind.STILL_OPEN:
						drawStillOpen(chart.ctx, row, state);
						break;
				}
			}
		},
		afterDatasetsDraw(chart) {
			const state = getState();
			for (const row of placed) {
				switch (row.row.kind) {
					case TimelineRowKind.BAR:
						for (const bar of row.bars) {
							drawBarEnd(chart.ctx, bar, bar.bar.opened, bar.x1, state);
							if (bar.bar.closed !== null) {
								drawBarEnd(chart.ctx, bar, bar.bar.closed, bar.x2, state);
							}
							drawBarOutline(chart.ctx, bar, state);
						}
						break;
					case TimelineRowKind.OTHER_YEARS:
						drawRowOutline(chart.ctx, row, state);
						break;
					case TimelineRowKind.STILL_OPEN:
						for (const bar of row.bars) {
							drawBarEnd(chart.ctx, bar, bar.bar.opened, bar.x1, state);
						}
						drawRowOutline(chart.ctx, row, state);
						break;
				}
				drawRowLabel(chart.ctx, row, state);
			}
			for (const point of state.timeline.points) {
				drawPoint(chart.ctx, chart, point, state);
			}
		},
		rowAt(point) {
			return (
				placed.find(
					({ x1, x2, y, thickness }) =>
						point.x >= x1 - 2 &&
						point.x <= x2 + 2 &&
						Math.abs(point.y - y) <= Math.max(thickness / 2, barHitHalfHeight),
				)?.row ?? null
			);
		},
	};
}
