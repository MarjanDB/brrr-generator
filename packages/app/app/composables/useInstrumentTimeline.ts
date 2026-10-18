import { ProvenanceField, type ProvenanceWalker, type ReportInstrument } from "@brrr/lib";
import type { Timeline, TimelineMark, TimelineTick } from "~/types/timeline";
import { markKeys } from "~/utils/i18nKeys";
import { buildTimeline, timelineTicks } from "~/utils/instrumentTimeline";
import { fieldOf } from "~/utils/provenanceFields";

// An instrument's timeline: its marks and arcs, the axis ticks, and the tooltip text of a mark in
// the reader's locale.
export function useInstrumentTimeline(
	instrument: () => ReportInstrument,
	walker: () => ProvenanceWalker,
) {
	const { t, locale } = useI18n();
	const { date } = useProvenanceText();

	const timeline = computed<Timeline>(() => buildTimeline(instrument(), walker()));
	const ticks = computed<TimelineTick[]>(() =>
		timelineTicks(timeline.value.first, timeline.value.last),
	);

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

	return { timeline, ticks, describeMark };
}
