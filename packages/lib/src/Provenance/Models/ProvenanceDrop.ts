import type { DropReason } from "@brrr/Provenance/Models/DropReason";
import type { ProvenanceDetail } from "@brrr/Provenance/Models/ProvenanceDetail";
import type { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";

export type ProvenanceDropArgs = {
	node: ProvenanceNode;
	reason: DropReason;
	by: ProvenanceStage;
	detail: ProvenanceDetail | null;
};

export class ProvenanceDrop {
	public readonly node: ProvenanceNode;
	public readonly reason: DropReason;
	public readonly by: ProvenanceStage;
	public readonly detail: ProvenanceDetail | null;

	public constructor(args: ProvenanceDropArgs) {
		this.node = args.node;
		this.reason = args.reason;
		this.by = args.by;
		this.detail = args.detail;
	}
}
