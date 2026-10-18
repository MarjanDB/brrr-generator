import type { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";

export type ProvenanceWarningArgs = {
	node: ProvenanceNode;
	by: ProvenanceStage;
	detail: string;
};

export class ProvenanceWarning {
	public readonly node: ProvenanceNode;
	public readonly by: ProvenanceStage;
	public readonly detail: string;

	public constructor(args: ProvenanceWarningArgs) {
		this.node = args.node;
		this.by = args.by;
		this.detail = args.detail;
	}
}
