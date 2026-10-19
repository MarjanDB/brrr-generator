import { ProvenanceField, type ProvenanceWalker, type ReportInstrument } from "@brrr/lib";
import { DateTime, Duration } from "luxon";
import type { Timeline, TimelineBar, TimelineMark } from "~/types/timeline";
import { markKeys } from "~/utils/i18nKeys";
import { buildTimeline } from "~/utils/instrumentTimeline";
import { fieldOf } from "~/utils/provenanceFields";

// An instrument's timeline: its marks, bars and points, the tooltip text of a mark and the label of a
// bar in the reader's locale. The axis ticks depend on the axis's width, so the chart asks for them as it lays out.
export function useInstrumentTimeline(
	instrument: () => ReportInstrument,
	walker: () => ProvenanceWalker,
) {
	const { t, locale } = useI18n();
	const { date } = useProvenanceText();

	const timeline = computed<Timeline>(() => buildTimeline(instrument(), walker()));

	function describeMark(mark: TimelineMark): string {
		const day =
			fieldOf(mark.node, ProvenanceField.DATE) ?? fieldOf(mark.node, ProvenanceField.ACQUIRED_DATE);
		const quantity = Number(fieldOf(mark.node, ProvenanceField.QUANTITY));
		return t(markKeys[mark.kind], {
			date: day === null ? "" : date(day),
			quantity: new Intl.NumberFormat(locale.value).format(Math.abs(quantity)),
			amount: new Intl.NumberFormat(locale.value).format(
				Math.abs(Number(fieldOf(mark.node, ProvenanceField.PRICE))),
			),
			currency: fieldOf(mark.node, ProvenanceField.CURRENCY) ?? "",
		});
	}

	// "10 · held 2 mths": the lot's quantity and how long it was held, in whole years and months
	// (days under a month); for what is still open, its quantity.
	function describeBar(bar: TimelineBar): string {
		const quantity = new Intl.NumberFormat(locale.value).format(bar.quantity);
		if (bar.closed === null) {
			return t("download_bar_open", { quantity });
		}
		const held = DateTime.fromMillis(bar.closed.at, { zone: "utc" }).diff(
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
		const duration = Duration.fromObject(units, { locale: locale.value }).toHuman({
			unitDisplay: "short",
		});
		return t("download_bar_lot", { quantity, duration });
	}

	return { timeline, describeMark, describeBar };
}
