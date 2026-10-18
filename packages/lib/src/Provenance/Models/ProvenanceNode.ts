import type { ProvenanceNodeId } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import type { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";

export type ProvenanceNodeArgs = {
	id: ProvenanceNodeId;
	kind: ProvenanceNodeKind;
	label: string;
	fields: Record<string, string>;
};

export class ProvenanceNode {
	public readonly id: ProvenanceNodeId;
	public readonly kind: ProvenanceNodeKind;
	public readonly label: string;
	public readonly fields: Record<string, string>;

	public constructor(args: ProvenanceNodeArgs) {
		this.id = args.id;
		this.kind = args.kind;
		this.label = args.label;
		this.fields = args.fields;
	}
}
