import {
	DropReason,
	EDavkiProvenanceField,
	type ProvenanceNode,
	type ReportInstrument,
	type ReportLeftOut,
	type ReportMatchedLot,
} from "@brrr/lib";
import { DateTime } from "luxon";
import { Timelines } from "~/composables/instrumentTimeline/timelines";
import {
	type DetectedPart,
	DetectedReason,
	type DetectedRow,
	type FormLot,
} from "~/types/instrumentCard";
import {
	MarkState,
	type Timeline,
	type TimelineBar,
	type TimelineMark,
	TimelineMarkKind,
	TimelineWeight,
} from "~/types/timeline";
import { ReportInstruments } from "~/utils/reportInstruments";

// A number a form line holds, as a magnitude: a sale's line holds its quantity, and so its total,
// negative. Null when the line, or the field, is missing.
function lineValue(line: ProvenanceNode | null, field: EDavkiProvenanceField): number | null {
	const value = line?.fields[field];
	if (value === undefined) {
		return null;
	}
	const number = Math.abs(Number(value));
	return Number.isFinite(number) ? number : null;
}

// The form's figures for a lot: what each side's line says it cost or brought per unit, and the
// sale's total less the purchase's.
function formFiguresOf(
	matched: ReportMatchedLot | undefined,
): Pick<FormLot, "boughtPrice" | "soldPrice" | "netChange"> {
	const boughtLine = matched?.acquired.line ?? null;
	const soldLine = matched?.sold.line ?? null;
	const boughtTotal = lineValue(boughtLine, EDavkiProvenanceField.TOTAL_PRICE);
	const soldTotal = lineValue(soldLine, EDavkiProvenanceField.TOTAL_PRICE);
	return {
		boughtPrice: lineValue(boughtLine, EDavkiProvenanceField.PRICE_PER_UNIT),
		soldPrice: lineValue(soldLine, EDavkiProvenanceField.PRICE_PER_UNIT),
		netChange: boughtTotal === null || soldTotal === null ? null : soldTotal - boughtTotal,
	};
}

// The lots on the form, as the timeline draws them: top to bottom, by the day each opened, with the
// form's figures for each. A written option opens with its sale, so the buy and the sale are told
// apart by kind.
function formLotsOf(instrument: ReportInstrument, timeline: Timeline): FormLot[] {
	return timeline.bars.flatMap((bar) => {
		if (bar.lot === null || bar.closed === null || bar.weight !== TimelineWeight.REPORTED) {
			return [];
		}
		const openedByBuy = bar.opened.kind === TimelineMarkKind.BOUGHT;
		const matched = instrument.matchedLots.find((candidate) => candidate.node === bar.lot);
		return [
			{
				bar,
				lot: bar.lot,
				bought: openedByBuy ? bar.opened : bar.closed,
				sold: openedByBuy ? bar.closed : bar.opened,
				...formFiguresOf(matched),
			},
		];
	});
}

// The net change of every lot on the form that has one.
function formTotalOf(lots: FormLot[]): number {
	return lots.reduce((total, lot) => total + (lot.netChange ?? 0), 0);
}

// A dividend payer's dividends and taxes on the form, by date.
function formPaymentsOf(timeline: Timeline): TimelineMark[] {
	return timeline.marks.filter(
		(mark) =>
			(mark.kind === TimelineMarkKind.DIVIDEND || mark.kind === TimelineMarkKind.TAX) &&
			mark.weight === TimelineWeight.REPORTED,
	);
}

// What the report leaves out of every form for the same reasons: another year's, and what is still
// open. Any other drop is a reason of its own, which the report states.
const leftOutAsExpected = [DropReason.OUTSIDE_PERIOD, DropReason.POSITION_OPEN];

function yearOf(at: number): number {
	return DateTime.fromMillis(at, { zone: "utc" }).year;
}

// How much of a trade a reason covers; for lots of other years, the years they closed in.
function partOf(reason: DetectedReason, bars: TimelineBar[]): DetectedPart[] {
	if (bars.length === 0) {
		return [];
	}
	const otherYears =
		reason === DetectedReason.CLOSED_BEFORE_YEAR || reason === DetectedReason.CLOSED_AFTER_YEAR;
	const years = otherYears
		? [...new Set(bars.flatMap((bar) => (bar.closed === null ? [] : [yearOf(bar.closed.at)])))]
		: [];
	return [
		{
			reason,
			quantity: bars.reduce((sum, bar) => sum + bar.quantity, 0),
			years: years.sort((left, right) => left - right),
		},
	];
}

// A trade is split by the bars it opened or closed: the lots on the form, the lots closed before
// the tax year, those closed after it, and what is still open.
function tradePartsOf(mark: TimelineMark, timeline: Timeline, year: number): DetectedPart[] {
	const bars = timeline.bars.filter((bar) => bar.opened === mark || bar.closed === mark);
	const lots = bars.filter((bar) => bar.closed !== null);
	const reported = lots.filter((bar) => bar.weight === TimelineWeight.REPORTED);
	const other = lots.filter((bar) => bar.weight !== TimelineWeight.REPORTED);
	const closedBefore = other.filter((bar) => bar.closed !== null && yearOf(bar.closed.at) < year);
	const closedAfter = other.filter((bar) => !closedBefore.includes(bar));
	return [
		...partOf(DetectedReason.REPORTED, reported),
		...partOf(DetectedReason.CLOSED_BEFORE_YEAR, closedBefore),
		...partOf(DetectedReason.CLOSED_AFTER_YEAR, closedAfter),
		...partOf(
			DetectedReason.STILL_OPEN,
			bars.filter((bar) => bar.closed === null),
		),
	];
}

const whole = (reason: DetectedReason, years: number[] = []): DetectedPart[] => [
	{ reason, quantity: null, years },
];

// Why a mark is, or isn't, on the form. A drop the report gives a reason for comes first. A trade
// says how much of it is which; a payment of another year says the year it was paid; a corporate
// action says whether it changed lots on the form.
function partsOf(
	mark: TimelineMark,
	leftOut: ReportLeftOut[],
	timeline: Timeline,
	year: number,
): DetectedPart[] {
	const reported = mark.weight === TimelineWeight.REPORTED;
	if (!reported && leftOut.some((item) => !leftOutAsExpected.includes(item.drop.reason))) {
		return whole(DetectedReason.LEFT_OUT);
	}
	switch (mark.kind) {
		case TimelineMarkKind.BOUGHT:
		case TimelineMarkKind.SOLD: {
			const parts = tradePartsOf(mark, timeline, year);
			return parts.length > 0 ? parts : whole(DetectedReason.LEFT_OUT);
		}
		case TimelineMarkKind.DIVIDEND:
		case TimelineMarkKind.TAX:
			if (reported) {
				return whole(DetectedReason.REPORTED);
			}
			return leftOut.some((item) => item.drop.reason === DropReason.OUTSIDE_PERIOD)
				? whole(DetectedReason.PAID_OUTSIDE_YEAR, [yearOf(mark.at)])
				: whole(DetectedReason.LEFT_OUT);
		case TimelineMarkKind.BROKER_LOT:
			return whole(reported ? DetectedReason.REPORTED : DetectedReason.LEFT_OUT);
		case TimelineMarkKind.CORPORATE_ACTION:
			return whole(reported ? DetectedReason.APPLIED : DetectedReason.NO_EFFECT);
	}
}

// Everything detected for the instrument, one row per mark of its timeline, by date: each trade,
// payment, broker lot and corporate action, with why it is, or isn't, on the form of `year`.
function detectedRowsOf(
	instrument: ReportInstrument,
	timeline: Timeline,
	year: number,
): DetectedRow[] {
	return timeline.marks.map((mark) => {
		const leftOut = ReportInstruments.leftOutOf(instrument, mark.node);
		return { mark, parts: partsOf(mark, leftOut, timeline, year), leftOut };
	});
}

// How a row of "Everything detected" shows the focus: as its mark on the timeline, and lit when the
// focus is a lot it opened or closed, as the ends of the lot's bar are. `lit` is the chain the user
// picked, or null when none is picked.
function detectedRowStateOf(
	mark: TimelineMark,
	timeline: Timeline,
	focus: ProvenanceNode | null,
	lit: ReadonlySet<ProvenanceNode> | null,
): MarkState {
	const own = Timelines.markStateOf(mark.node, focus, lit);
	if (own === MarkState.FOCUSED || own === MarkState.LIT) {
		return own;
	}
	const endsTheFocusedLot = timeline.bars.some(
		(bar) => bar.lot !== null && bar.lot === focus && (bar.opened === mark || bar.closed === mark),
	);
	return endsTheFocusedLot ? MarkState.LIT : own;
}

// The rows of the card's tables: the lots or payments on the form, and everything detected.
export const InstrumentRows = {
	formLotsOf,
	formTotalOf,
	formPaymentsOf,
	detectedRowsOf,
	detectedRowStateOf,
};
