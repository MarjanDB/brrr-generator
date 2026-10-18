import type { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import type { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";

export type ProvenanceEdgeArgs = {
	from: ProvenanceNode;
	to: ProvenanceNode;
	change: ProvenanceChange;
	by: ProvenanceStage;
	detail: string | null;
};

export class ProvenanceEdge {
	public readonly from: ProvenanceNode;
	public readonly to: ProvenanceNode;
	public readonly change: ProvenanceChange;
	public readonly by: ProvenanceStage;
	public readonly detail: string | null;

	public constructor(args: ProvenanceEdgeArgs) {
		this.from = args.from;
		this.to = args.to;
		this.change = args.change;
		this.by = args.by;
		this.detail = args.detail;
	}
}
