import type {
	ProvenanceDrop,
	ProvenanceNode,
	ProvenanceWarning,
	ReportInstrument,
	ReportLeftOut,
	ReportMatchedLot,
} from "@brrr/lib";

function matchedLotOf(instrument: ReportInstrument, node: ProvenanceNode): ReportMatchedLot | null {
	return instrument.matchedLots.find((matched) => matched.node === node) ?? null;
}

// A drop's reason and detail, not where it sits: two legs dropped the same way are one.
function dropKey(drop: ProvenanceDrop): string {
	const values = Object.entries(drop.detail?.values ?? {})
		.map(([name, value]) => `${name}=${value}`)
		.sort();
	return `${drop.reason}:${drop.detail?.kind ?? "-"}:${values.join(",")}`;
}

// What the report left out about one item of the instrument: an event, a broker lot, or a matched
// lot (both of its legs, said once when they were left out the same way).
export function leftOutOf(instrument: ReportInstrument, node: ProvenanceNode): ReportLeftOut[] {
	const own = [...instrument.events, ...instrument.brokerLots]
		.filter((item) => item.node === node)
		.flatMap((item) => item.leftOut);
	const matched = matchedLotOf(instrument, node);
	const all =
		matched === null ? own : [...own, ...matched.acquired.leftOut, ...matched.sold.leftOut];
	const byKey = new Map<string, ReportLeftOut>();
	for (const item of all) {
		const key = dropKey(item.drop);
		if (!byKey.has(key)) {
			byKey.set(key, item);
		}
	}
	return [...byKey.values()];
}

// The warnings about one item: on the node itself, or for a matched lot on its legs and lines.
export function warningsOf(
	instrument: ReportInstrument,
	node: ProvenanceNode,
): ProvenanceWarning[] {
	const matched = matchedLotOf(instrument, node);
	const nodes = new Set<ProvenanceNode>([node]);
	if (matched !== null) {
		for (const side of [matched.acquired, matched.sold]) {
			nodes.add(side.leg);
			if (side.line !== null) {
				nodes.add(side.line);
			}
		}
	}
	return instrument.warnings.filter((warning) => nodes.has(warning.node));
}
