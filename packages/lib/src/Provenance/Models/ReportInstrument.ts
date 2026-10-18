import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";
import type { ProvenanceWarning } from "@brrr/Provenance/Models/ProvenanceWarning";
import type { ReportInstrumentKind } from "@brrr/Provenance/Models/ReportInstrumentKind";
import type { ReportItem } from "@brrr/Provenance/Models/ReportItem";
import type { ReportMatchedLot } from "@brrr/Provenance/Models/ReportMatchedLot";

export type ReportInstrumentArgs = {
	kind: ReportInstrumentKind;
	node: ProvenanceNode;
	events: ReportItem[];
	brokerLots: ReportItem[];
	matchedLots: ReportMatchedLot[];
	corporateActions: ProvenanceNode[];
	lines: ProvenanceNode[];
	notInReport: number;
	warnings: ProvenanceWarning[];
};

export class ReportInstrument {
	public readonly kind: ReportInstrumentKind;
	public readonly node: ProvenanceNode;
	public readonly events: ReportItem[];
	public readonly brokerLots: ReportItem[];
	public readonly matchedLots: ReportMatchedLot[];
	public readonly corporateActions: ProvenanceNode[];
	public readonly lines: ProvenanceNode[];
	public readonly notInReport: number;
	public readonly warnings: ProvenanceWarning[];

	public constructor(args: ReportInstrumentArgs) {
		this.kind = args.kind;
		this.node = args.node;
		this.events = args.events;
		this.brokerLots = args.brokerLots;
		this.matchedLots = args.matchedLots;
		this.corporateActions = args.corporateActions;
		this.lines = args.lines;
		this.notInReport = args.notInReport;
		this.warnings = args.warnings;
	}
}
