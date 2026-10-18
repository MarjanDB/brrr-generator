import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";
import type { ReportMatchedLotSide } from "@brrr/Provenance/Models/ReportMatchedLotSide";

export type ReportMatchedLotArgs = {
	node: ProvenanceNode;
	acquired: ReportMatchedLotSide;
	sold: ReportMatchedLotSide;
};

export class ReportMatchedLot {
	public readonly node: ProvenanceNode;
	public readonly acquired: ReportMatchedLotSide;
	public readonly sold: ReportMatchedLotSide;

	public constructor(args: ReportMatchedLotArgs) {
		this.node = args.node;
		this.acquired = args.acquired;
		this.sold = args.sold;
	}
}
