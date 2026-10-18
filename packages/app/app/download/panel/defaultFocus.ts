import {
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	type ReportInstrument,
} from "@brrr/lib";
import { fieldOf } from "~/download/fields";

// The item an instrument opens on: its first sale (the sketch opens on a sale, which has the
// richest graph), else its first dividend, else its first event, broker lot or corporate action.
export function defaultFocus(instrument: ReportInstrument): ProvenanceNode {
	const events = instrument.events.map((item) => item.node);
	const firstOf = (kind: ProvenanceEventKind): ProvenanceNode | undefined =>
		events.find((event) => fieldOf(event, ProvenanceField.EVENT_KIND) === kind);
	const focus =
		firstOf(ProvenanceEventKind.SOLD) ??
		firstOf(ProvenanceEventKind.DIVIDEND) ??
		events[0] ??
		instrument.brokerLots[0]?.node ??
		instrument.corporateActions[0];
	if (focus === undefined) {
		throw new Error("An instrument in the report has no item to focus on");
	}
	return focus;
}
