import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";
import type { ReportLeftOut } from "@brrr/Provenance/Models/ReportLeftOut";

export type ReportItemArgs = {
	node: ProvenanceNode;
	leftOut: ReportLeftOut[];
};

export class ReportItem {
	public readonly node: ProvenanceNode;
	public readonly leftOut: ReportLeftOut[];

	public constructor(args: ReportItemArgs) {
		this.node = args.node;
		this.leftOut = args.leftOut;
	}
}
