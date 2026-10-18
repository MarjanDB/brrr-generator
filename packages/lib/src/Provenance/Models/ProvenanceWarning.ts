import type { ProvenanceDetail } from "@brrr/Provenance/Models/ProvenanceDetail";
import type { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";

export type ProvenanceWarningArgs = {
	node: ProvenanceNode;
	by: ProvenanceStage;
	detail: ProvenanceDetail;
};

export class ProvenanceWarning {
	public readonly node: ProvenanceNode;
	public readonly by: ProvenanceStage;
	public readonly detail: ProvenanceDetail;

	public constructor(args: ProvenanceWarningArgs) {
		this.node = args.node;
		this.by = args.by;
		this.detail = args.detail;
	}
}
