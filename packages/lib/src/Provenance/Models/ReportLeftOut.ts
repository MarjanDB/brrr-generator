import type { DropCategory } from "@brrr/Provenance/Models/DropCategory";
import type { ProvenanceDrop } from "@brrr/Provenance/Models/ProvenanceDrop";
import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";

export type ReportLeftOutArgs = {
	subject: ProvenanceNode;
	drop: ProvenanceDrop;
	category: DropCategory;
};

export class ReportLeftOut {
	public readonly subject: ProvenanceNode;
	public readonly drop: ProvenanceDrop;
	public readonly category: DropCategory;

	public constructor(args: ReportLeftOutArgs) {
		this.subject = args.subject;
		this.drop = args.drop;
		this.category = args.category;
	}
}
