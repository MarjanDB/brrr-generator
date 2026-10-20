import {
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	type ProvenanceWalker,
	type ReportInstrument,
	ReportInstrumentKind,
} from "@brrr/lib";
import { DateTime, Duration } from "luxon";
import { PluralForm, QuantityUnit } from "~/types/instrumentCard";
import {
	type Timeline,
	type TimelineBar,
	type TimelineMark,
	TimelineMarkKind,
	type TimelineRow,
	TimelineRowKind,
} from "~/types/timeline";
import { eventKindKeys, markKeys, quantityUnitKeys } from "~/utils/i18nKeys";
import { chipOf } from "~/utils/instrumentPanel";
import { buildTimeline } from "~/utils/instrumentTimeline";
import { fieldOf } from "~/utils/provenanceFields";

// An instrument's timeline: its marks, bars and points, and what the timeline, the tables under it
// and the Trace tab say about them, in the reader's locale. The axis ticks depend on the axis's
// width, so the chart asks for them as it lays out.
export function useInstrumentTimeline(
	instrument: () => ReportInstrument,
	walker: () => ProvenanceWalker,
) {
	const { t, locale } = useI18n();
	const { date, chipText } = useProvenanceText();

	const timeline = computed<Timeline>(() => buildTimeline(instrument(), walker()));

	// "10 shares", "1 contract": a quantity with its unit, in the plural form the locale asks for.
	function describeQuantity(quantity: number): string {
		const unit =
			instrument().kind === ReportInstrumentKind.OPTION_CONTRACT
				? QuantityUnit.CONTRACT
				: QuantityUnit.SHARE;
		const category = new Intl.PluralRules(locale.value).select(quantity);
		const form = Object.values(PluralForm).find((candidate) => candidate === category);
		return t(quantityUnitKeys[unit][form ?? PluralForm.OTHER], {
			quantity: new Intl.NumberFormat(locale.value).format(quantity),
		});
	}

	function describeMark(mark: TimelineMark): string {
		const day =
			fieldOf(mark.node, ProvenanceField.DATE) ?? fieldOf(mark.node, ProvenanceField.ACQUIRED_DATE);
		const quantity = Number(fieldOf(mark.node, ProvenanceField.QUANTITY));
		return t(markKeys[mark.kind], {
			date: day === null ? "" : date(day),
			quantity: describeQuantity(Math.abs(quantity)),
			amount: new Intl.NumberFormat(locale.value).format(
				Math.abs(Number(fieldOf(mark.node, ProvenanceField.PRICE))),
			),
			currency: fieldOf(mark.node, ProvenanceField.CURRENCY) ?? "",
		});
	}

	// How long a lot was held, written out in whole years and months (days under a month):
	// "1 year, 6 months".
	function describeHeld(bar: TimelineBar): string {
		const held = DateTime.fromMillis(bar.closed?.at ?? bar.opened.at, { zone: "utc" }).diff(
			DateTime.fromMillis(bar.opened.at, { zone: "utc" }),
			["years", "months", "days"],
		);
		const units =
			held.years > 0 || held.months > 0
				? {
						...(held.years > 0 ? { years: held.years } : {}),
						...(held.months > 0 ? { months: held.months } : {}),
					}
				: { days: held.days };
		return Duration.fromObject(units, { locale: locale.value }).toHuman({ unitDisplay: "long" });
	}

	// "10 shares · held 2 months": the lot's quantity and how long it was held; for what is still
	// open, its quantity.
	function describeBar(bar: TimelineBar): string {
		const quantity = describeQuantity(bar.quantity);
		if (bar.closed === null) {
			return t("download_bar_open", { quantity });
		}
		return t("download_bar_lot", { quantity, duration: describeHeld(bar) });
	}

	// What a mark is: a trade or a payment by its kind, a corporate action by its chip.
	function describeWhat(mark: TimelineMark): string {
		const kind = Object.values(ProvenanceEventKind).find(
			(candidate) => candidate === fieldOf(mark.node, ProvenanceField.EVENT_KIND),
		);
		if (kind !== undefined) {
			return t(eventKindKeys[kind]);
		}
		if (mark.kind === TimelineMarkKind.BROKER_LOT) {
			return t("download_what_broker_lot");
		}
		const chip = chipOf(mark.node);
		return chip === null ? t("download_what_corporate_action") : chipText(chip);
	}

	// What the Trace tab calls a node of the timeline: a mark as its tooltip does, a lot by its
	// quantity and how long it was held; "" for anything else.
	function describeNode(node: ProvenanceNode): string {
		const mark = timeline.value.marks.find((candidate) => candidate.node === node);
		if (mark !== undefined) {
			return describeMark(mark);
		}
		const bar = timeline.value.bars.find((candidate) => candidate.lot === node);
		if (bar === undefined) {
			return "";
		}
		return t("download_trace_lot", {
			quantity: describeQuantity(bar.quantity),
			duration: describeHeld(bar),
		});
	}

	// A bar's row says what its bar says; a folded row how many lots closed in other years, or how
	// much is still open.
	function describeRow(row: TimelineRow): string {
		switch (row.kind) {
			case TimelineRowKind.BAR: {
				const [bar] = row.bars;
				return bar === undefined ? "" : describeBar(bar);
			}
			case TimelineRowKind.OTHER_YEARS:
				return t("download_row_other_years", { count: row.bars.length });
			case TimelineRowKind.STILL_OPEN:
				return t("download_row_still_open", {
					quantity: describeQuantity(row.bars.reduce((sum, bar) => sum + bar.quantity, 0)),
				});
		}
	}

	return {
		timeline,
		describeQuantity,
		describeMark,
		describeBar,
		describeRow,
		describeHeld,
		describeWhat,
		describeNode,
	};
}
