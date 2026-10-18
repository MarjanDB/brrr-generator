import type { ProvenanceDetailKind } from "@brrr/Provenance/Models/ProvenanceDetailKind";
import type { ProvenanceDetailValue } from "@brrr/Provenance/Models/ProvenanceDetailValue";

export type ProvenanceDetailArgs = {
	kind: ProvenanceDetailKind;
	values: Partial<Record<ProvenanceDetailValue, string>>;
};

export class ProvenanceDetail {
	public readonly kind: ProvenanceDetailKind;
	public readonly values: Partial<Record<ProvenanceDetailValue, string>>;

	public constructor(args: ProvenanceDetailArgs) {
		this.kind = args.kind;
		this.values = args.values;
	}
}
