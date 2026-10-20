import type { ProvenanceNode, ReportLeftOut } from "@brrr/lib";
import type { TimelineBar, TimelineMark } from "~/types/timeline";

// The tabs under an instrument's timeline: what is on the form, everything detected for the
// instrument, and the trace of the focused item.
export enum InstrumentCardTab {
	ON_THE_FORM = "ON_THE_FORM",
	DETECTED = "DETECTED",
	TRACE = "TRACE",
}

// Why something detected for an instrument is, or isn't, on this tax year's form: reported on it;
// left out because its lots closed before or after the tax year, because the position is still
// open, because it was paid in another year, or for a reason the report gives; and for a corporate
// action, whether it changed lots on the form.
export enum DetectedReason {
	REPORTED = "REPORTED",
	CLOSED_BEFORE_YEAR = "CLOSED_BEFORE_YEAR",
	CLOSED_AFTER_YEAR = "CLOSED_AFTER_YEAR",
	STILL_OPEN = "STILL_OPEN",
	PAID_OUTSIDE_YEAR = "PAID_OUTSIDE_YEAR",
	LEFT_OUT = "LEFT_OUT",
	APPLIED = "APPLIED",
	NO_EFFECT = "NO_EFFECT",
}

// One reason and how much of the item it covers: a trade can be partly on the form and partly in
// lots of other years. The quantity is null for what has none (a payment, a broker lot, a corporate
// action); the years are those its lots closed in, or the year it was paid.
export type DetectedPart = {
	reason: DetectedReason;
	quantity: number | null;
	years: number[];
};

// A row of "Everything detected": a mark of the timeline, why it is or isn't on the form, and what
// the report says about leaving it out.
export type DetectedRow = {
	mark: TimelineMark;
	parts: DetectedPart[];
	leftOut: ReportLeftOut[];
};

// A row of "On the form": a lot's bar, its matched lot, its buy and sale, whichever came first, and
// the figures the form holds for it in the base currency: the price per unit it was bought and sold
// at, and the sale's total less the purchase's. Null where a line lacks one.
export type FormLot = {
	bar: TimelineBar;
	lot: ProvenanceNode;
	bought: TimelineMark;
	sold: TimelineMark;
	boughtPrice: number | null;
	soldPrice: number | null;
	netChange: number | null;
};

// What a row of "Everything detected" says for one of its reasons: the verdict on its badge, and
// the detail after it.
export type DetectedPartText = {
	reason: DetectedReason;
	verdict: string;
	detail: string;
};
