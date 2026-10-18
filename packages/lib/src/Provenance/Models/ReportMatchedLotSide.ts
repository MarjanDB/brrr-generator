import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";
import type { ReportLeftOut } from "@brrr/Provenance/Models/ReportLeftOut";

export type ReportMatchedLotSideArgs = {
	leg: ProvenanceNode;
	line: ProvenanceNode | null;
	leftOut: ReportLeftOut[];
};

export class ReportMatchedLotSide {
	public readonly leg: ProvenanceNode;
	public readonly line: ProvenanceNode | null;
	public readonly leftOut: ReportLeftOut[];

	public constructor(args: ReportMatchedLotSideArgs) {
		this.leg = args.leg;
		this.line = args.line;
		this.leftOut = args.leftOut;
	}
}
